import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import { glob } from 'glob';
import path from 'path';
import { fileURLToPath } from 'url';
dotenv.config();
const processWithPackaging = process;
const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const runtimeDir = path.dirname(process.execPath);
const resourcesDir = processWithPackaging.resourcesPath;
const isDistBuild = path.basename(currentDir) === 'dist';
const projectRoot = isDistBuild ? path.resolve(currentDir, '..') : currentDir;
function resolveFirstExistingPath(candidates) {
    return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
}
function resolvePublicPath() {
    return resolveFirstExistingPath([
        ...(resourcesDir ? [path.join(resourcesDir, 'public')] : []),
        path.join(runtimeDir, 'public'),
        path.join(currentDir, 'public'),
        path.join(projectRoot, 'public'),
        path.join(projectRoot, 'dist', 'public')
    ]);
}
function resolveExamplesPath() {
    return resolveFirstExistingPath([
        ...(resourcesDir ? [path.join(resourcesDir, 'examples')] : []),
        path.join(runtimeDir, 'examples'),
        path.join(projectRoot, 'examples'),
        path.resolve(projectRoot, '..', 'examples')
    ]);
}
function createApp(options) {
    const app = express();
    const vitePort = options.vitePort ?? 3001;
    const packagedRuntime = options.packaged ?? (Boolean(processWithPackaging.pkg) || Boolean(resourcesDir));
    const publicPath = resolvePublicPath();
    const luaExamplesPath = resolveExamplesPath();
    const shouldServeStaticUi = isDistBuild || packagedRuntime;
    app.use(cors());
    app.use(express.json());
    app.get('/api/files', (_req, res) => {
        console.log('Listing files in:', luaExamplesPath);
        try {
            const files = glob.sync('**/*.lua', { cwd: luaExamplesPath, nodir: true });
            const normalizedFiles = files.map((filePath) => filePath.replace(/\\/g, '/'));
            res.json(normalizedFiles);
        }
        catch (error) {
            console.error('Glob error:', error);
            res.status(500).json({ error: 'Failed to list files' });
        }
    });
    app.get('/api/file-content', (req, res) => {
        const relativePath = req.query.path;
        if (!relativePath) {
            return res.status(400).json({ error: 'Path required' });
        }
        const examplesRoot = path.resolve(luaExamplesPath);
        const filePath = path.resolve(examplesRoot, relativePath);
        if (!filePath.startsWith(examplesRoot + path.sep) && filePath !== examplesRoot) {
            return res.status(403).json({ error: 'Access denied' });
        }
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }
        const content = fs.readFileSync(filePath, 'utf8');
        res.json({ content });
    });
    app.get('/api-docs', (_req, res) => {
        res.json({ message: 'OpenAPI documentation will be here' });
    });
    if (shouldServeStaticUi) {
        console.log(`Serving static files from: ${publicPath}`);
        app.use(express.static(publicPath));
        app.get(/^\/(?!api).*/, (_req, res) => {
            res.sendFile(path.join(publicPath, 'index.html'));
        });
    }
    else {
        app.get('/', (_req, res) => {
            res.redirect(302, `http://localhost:${vitePort}/`);
        });
    }
    return app;
}
export async function startServer(options = {}) {
    const packagedRuntime = options.packaged ?? (Boolean(processWithPackaging.pkg) || Boolean(resourcesDir));
    const defaultPort = isDistBuild || packagedRuntime ? 1234 : 3000;
    const port = options.port ?? Number(process.env.PORT ?? defaultPort);
    const host = options.host;
    const app = createApp(options);
    const server = await new Promise((resolve) => {
        if (host) {
            const listeningServer = app.listen(port, host, () => resolve(listeningServer));
            return;
        }
        const listeningServer = app.listen(port, () => resolve(listeningServer));
    });
    const addressInfo = server.address();
    const actualPort = typeof addressInfo === 'object' && addressInfo ? addressInfo.port : port;
    const urlHost = host ?? 'localhost';
    const url = `http://${urlHost}:${actualPort}`;
    console.log(`Server running at ${url}`);
    return {
        app,
        port: actualPort,
        url,
        close: async () => new Promise((resolve, reject) => {
            server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        })
    };
}
const startedDirectly = process.argv[1] && path.resolve(process.argv[1]) === currentFilePath;
if (startedDirectly) {
    startServer().catch((error) => {
        console.error('Failed to start server:', error);
        process.exit(1);
    });
}
