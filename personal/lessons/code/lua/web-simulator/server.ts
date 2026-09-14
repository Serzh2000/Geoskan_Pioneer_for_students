import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { glob } from 'glob';
import type { Server } from 'http';
import path from 'path';
import { rateLimit } from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { registerExternalPythonBridgeRoutes } from './server/external-python-bridge.js';
import { registerMavlinkBridgeRoutes, stopAllMavlinkBridges } from './server/mavlink-bridge.js';
import { registerPythonRuntimeRoutes, stopAllLocalPythonRuns } from './server/python-runtime.js';

dotenv.config();

type ProcessWithPackaging = NodeJS.Process & {
    pkg?: unknown;
    resourcesPath?: string;
};

export interface StartServerOptions {
    port?: number;
    host?: string;
    packaged?: boolean;
    vitePort?: number;
}

export interface StartedServer {
    app: express.Express;
    close: () => Promise<void>;
    port: number;
    url: string;
}

const processWithPackaging = process as ProcessWithPackaging;
const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const runtimeDir = path.dirname(process.execPath);
const resourcesDir = processWithPackaging.resourcesPath;
const isDistBuild = path.basename(currentDir) === 'dist';
const projectRoot = isDistBuild ? path.resolve(currentDir, '..') : currentDir;

function resolveFirstExistingPath(candidates: string[]): string {
    return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
}

function resolvePublicPath(): string {
    return resolveFirstExistingPath([
        ...(resourcesDir ? [path.join(resourcesDir, 'public')] : []),
        path.join(runtimeDir, 'public'),
        path.join(currentDir, 'public'),
        path.join(projectRoot, 'public'),
        path.join(projectRoot, 'dist', 'public')
    ]);
}

function resolveExamplesPath(): string {
    return resolveFirstExistingPath([
        ...(resourcesDir ? [path.join(resourcesDir, 'examples')] : []),
        path.join(runtimeDir, 'examples'),
        path.join(projectRoot, 'examples'),
        path.resolve(projectRoot, '..', 'examples')
    ]);
}

function resolveAutopilotParametersPath(): string {
    return path.join(projectRoot, 'pio-classic-newopt-stable-1.6.7178-1.properties');
}

// Ограничивает CORS конкретными origin'ами в проде через CORS_ORIGIN (список через
// запятую), например: CORS_ORIGIN=https://sim.example.ru
// Без этой переменной остаётся открытый CORS — так удобнее для локальной разработки
// (Vite dev-server на отдельном порту), но НЕ подходит для публичного деплоя.
function resolveCorsOptions(): cors.CorsOptions | undefined {
    const configured = process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()).filter(Boolean);
    if (!configured || configured.length === 0) {
        return undefined;
    }

    return { origin: configured };
}

// Внешний Python-мост высокочастотен по самой своей природе, причём с ОБЕИХ сторон:
//   * вкладка браузера опрашивает /events и /state каждые 100-250мс
//     (public/modules/python/external-bridge.ts) — это до ~20 запросов/сек на одну
//     привязку дрона;
//   * внешний скрипт/IDLE шлёт команды через POST /event потоком (go_to_local_point в
//     цикле, set_manual_speed, led_control).
// Оба потока идут с одного и того же локального IP, то есть делят один счётчик лимитера.
// Общий лимит 30/60с такой трафик выедает примерно за полторы секунды, после чего сервер
// начинает отвечать 429 уже на всё, включая приём команд. При этом и Python-hook
// (python_bridge/pioneer_browser_bridge_runtime.py глушит любые HTTP-ошибки), и браузерный
// поллинг (тихий catch) ошибки не показывают — снаружи это выглядит как «дрон не реагирует,
// и нигде нет ни одной ошибки». Поэтому весь префикс моста выведен из-под общего лимитера и
// получает собственный, кратно более щедрый (но всё ещё конечный) лимит.
export const EXTERNAL_BRIDGE_ROUTE_PREFIX = '/api/external-python-bridge';

// Основной rate-limit на чувствительные API: запуск Python-кода, MAVLink-мост, запись
// параметров автопилота. Не защищает от целенаправленной атаки, но резко снижает ущерб
// от автоматического перебора/скана и от одного случайного скрипта, заваливающего сервер
// запросами. Порог настраивается через RATE_LIMIT_MAX (запросов за RATE_LIMIT_WINDOW_MS).
export function createSensitiveRouteLimiter() {
    return rateLimit({
        windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
        limit: Number(process.env.RATE_LIMIT_MAX ?? 30),
        standardHeaders: true,
        legacyHeaders: false,
        // req.path не включает префикс монтирования ('/api'), поэтому сравниваем полный
        // путь через baseUrl + path — иначе EXTERNAL_BRIDGE_ROUTE_PREFIX (полный путь с
        // /api) не совпал бы никогда и skip не сработал бы ни разу.
        skip: (req) => `${req.baseUrl}${req.path}`.startsWith(EXTERNAL_BRIDGE_ROUTE_PREFIX),
        message: { ok: false, error: 'Слишком много запросов. Подождите немного и попробуйте снова.' }
    });
}

// Отдельный лимит для внешнего Python-моста — см. комментарий у
// EXTERNAL_BRIDGE_ROUTE_PREFIX. 6000/60с (=100/сек) с запасом покрывает наблюдаемые
// ~20 запросов/сек на привязку дрона плюс поток команд от внешнего скрипта, но всё ещё
// ограничивает настоящий флуд. Настраивается отдельными переменными окружения, чтобы
// не трогать общий RATE_LIMIT_MAX.
export function createExternalBridgeLimiter() {
    return rateLimit({
        windowMs: Number(process.env.BRIDGE_RATE_LIMIT_WINDOW_MS ?? 60_000),
        limit: Number(process.env.BRIDGE_RATE_LIMIT_MAX ?? 6000),
        standardHeaders: true,
        legacyHeaders: false,
        message: { ok: false, error: 'Слишком много запросов к внешнему мосту. Подождите немного и попробуйте снова.' }
    });
}

function createApp(options: StartServerOptions): express.Express {
    const app = express();
    const vitePort = options.vitePort ?? 3001;
    const packagedRuntime = options.packaged ?? (Boolean(processWithPackaging.pkg) || Boolean(resourcesDir));
    const publicPath = resolvePublicPath();
    const luaExamplesPath = resolveExamplesPath();
    const autopilotParametersPath = resolveAutopilotParametersPath();
    const shouldServeStaticUi = isDistBuild || packagedRuntime;

    app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 0));
    app.use(cors(resolveCorsOptions()));
    app.use(express.json({ limit: '10mb' }));
    app.use('/api', createSensitiveRouteLimiter());
    app.use(EXTERNAL_BRIDGE_ROUTE_PREFIX, createExternalBridgeLimiter());

    app.get('/api/files', async (_req: express.Request, res: express.Response) => {
        console.log('Listing files in:', luaExamplesPath);

        try {
            const files = await glob('**/*.lua', { cwd: luaExamplesPath, nodir: true });
            const normalizedFiles = files.map((filePath) => filePath.replace(/\\/g, '/'));
            res.json(normalizedFiles);
        } catch (error) {
            console.error('Glob error:', error);
            res.status(500).json({ error: 'Failed to list files' });
        }
    });

    app.get('/api/file-content', async (req: express.Request, res: express.Response) => {
        const relativePath = req.query.path as string | undefined;
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

        try {
            const content = await readFile(filePath, 'utf8');
            res.json({ content });
        } catch (error) {
            console.error('Failed to read file content:', error);
            res.status(500).json({ error: 'Failed to read file' });
        }
    });

    app.get('/api/autopilot-parameters', async (_req: express.Request, res: express.Response) => {
        try {
            if (!fs.existsSync(autopilotParametersPath)) {
                return res.status(404).json({ error: 'Файл параметров автопилота не найден.' });
            }

            const content = await readFile(autopilotParametersPath, 'utf8');
            return res.json({
                fileName: path.basename(autopilotParametersPath),
                filePath: autopilotParametersPath,
                content
            });
        } catch (error) {
            console.error('Failed to read autopilot parameters:', error);
            return res.status(500).json({ error: 'Не удалось прочитать файл параметров автопилота.' });
        }
    });

    app.put('/api/autopilot-parameters', async (req: express.Request, res: express.Response) => {
        const content = typeof req.body?.content === 'string' ? req.body.content : null;
        if (!content) {
            return res.status(400).json({ error: 'Тело запроса должно содержать строковое поле content.' });
        }

        try {
            await writeFile(autopilotParametersPath, content, 'utf8');
            return res.json({
                ok: true,
                fileName: path.basename(autopilotParametersPath),
                filePath: autopilotParametersPath,
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Failed to save autopilot parameters:', error);
            return res.status(500).json({ error: 'Не удалось сохранить файл параметров автопилота.' });
        }
    });
    registerPythonRuntimeRoutes(app, projectRoot);
    registerExternalPythonBridgeRoutes(app);
    registerMavlinkBridgeRoutes(app);

    if (shouldServeStaticUi) {
        console.log(`Serving static files from: ${publicPath}`);
        app.use(express.static(publicPath));
        app.get(/^\/(?!api).*/, (_req: express.Request, res: express.Response) => {
            res.sendFile(path.join(publicPath, 'index.html'));
        });
    } else {
        app.get('/', (_req: express.Request, res: express.Response) => {
            res.redirect(302, `http://localhost:${vitePort}/`);
        });
    }

    // Last-resort safety net, registered after every route. Express 5 (unlike
    // Express 4) already forwards a rejected promise from an async handler to
    // `next(err)` on its own, and a synchronous throw has always been caught
    // by Express's router — so nothing upstream needs an explicit wrapper for
    // that to work. This middleware does not replace the more specific
    // local try/catch error handling already present in individual routes
    // (e.g. /api/autopilot-parameters); it only catches whatever slips past
    // those, so one bad request can't crash the whole (unauthenticated,
    // publicly reachable) process.
    const handleUnhandledError: express.ErrorRequestHandler = (err, _req, res, next) => {
        if (res.headersSent) {
            next(err);
            return;
        }
        console.error('Unhandled error while processing request:', err);
        res.status(500).json({ ok: false, error: 'Internal server error.' });
    };
    app.use(handleUnhandledError);

    return app;
}

export async function startServer(options: StartServerOptions = {}): Promise<StartedServer> {
    const packagedRuntime = options.packaged ?? (Boolean(processWithPackaging.pkg) || Boolean(resourcesDir));
    const defaultPort = isDistBuild || packagedRuntime ? 1234 : 3000;
    const port = options.port ?? Number(process.env.PORT ?? defaultPort);
    const host = options.host;
    const app = createApp(options);

    const server = await new Promise<Server>((resolve) => {
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
        close: async () => new Promise<void>((resolve, reject) => {
            stopAllLocalPythonRuns();
            stopAllMavlinkBridges();
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
