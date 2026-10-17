import fs from 'node:fs';
import { glob } from 'glob';
import { defineConfig, type Plugin } from 'vite';
import path from 'path';

const htmlIncludePattern = /<!--\s*@include\s+(.+?)\s*-->/g;

function resolveHtmlIncludes(source: string, currentFile: string, chain = new Set<string>()): string {
  return source.replace(htmlIncludePattern, (_match, includePath) => {
    const resolvedPath = path.resolve(path.dirname(currentFile), String(includePath).trim());

    if (chain.has(resolvedPath)) {
      throw new Error(`Recursive HTML include detected: ${resolvedPath}`);
    }
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`HTML include not found: ${resolvedPath}`);
    }

    const nextChain = new Set(chain);
    nextChain.add(resolvedPath);
    const included = fs.readFileSync(resolvedPath, 'utf8');
    return resolveHtmlIncludes(included, resolvedPath, nextChain);
  });
}

function htmlIncludesPlugin(rootDir: string): Plugin {
  const fragmentsDir = path.resolve(rootDir, 'fragments');
  const indexFile = path.resolve(rootDir, 'index.html');

  return {
    name: 'html-includes',
    transformIndexHtml(html) {
      return resolveHtmlIncludes(html, indexFile);
    },
    handleHotUpdate(ctx) {
      if (ctx.file.startsWith(fragmentsDir) && ctx.file.endsWith('.html')) {
        ctx.server.ws.send({ type: 'full-reload' });
      }
    }
  };
}

/*
 * The editor's example list and file contents come from /api/files and /api/file-content, which server.ts answers.
 * With only `vite` running (no API server on :3010) those calls failed and the list said "Нет связи". The dev server
 * answers the two itself, from the same folders server.ts reads, so examples work with Vite alone; when the API
 * server is up the answers are identical. Keep the folder lists in step with resolveExamplesRoots() in server.ts.
 */
function examplesApiPlugin(projectRoot: string): Plugin {
  const existing = (candidates: string[]) => [...new Set(candidates.map((candidate) => path.resolve(candidate)))].filter((candidate) => fs.existsSync(candidate));
  const rootsFor = (lang: string) =>
    lang === 'python-sdk2'
      ? existing([path.join(projectRoot, 'examples-python-sdk2'), path.resolve(projectRoot, '..', 'examples', 'python-onboard', 'pioneer_sdk2')])
      : lang === 'python'
        ? existing([path.join(projectRoot, 'examples-python'), path.resolve(projectRoot, '..', 'examples', 'python')])
        : existing([path.join(projectRoot, 'examples'), path.resolve(projectRoot, '..', 'examples', 'lua')]);
  const sendJson = (res: import('node:http').ServerResponse, status: number, body: unknown) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(body));
  };

  return {
    name: 'examples-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        if (req.method !== 'GET' || (url.pathname !== '/api/files' && url.pathname !== '/api/file-content')) return next();
        const requested = url.searchParams.get('lang');
        const lang = requested === 'python' || requested === 'python-sdk2' ? requested : 'lua';
        const roots = rootsFor(lang);
        try {
          if (url.pathname === '/api/files') {
            const seen = new Set<string>();
            const files: string[] = [];
            for (const root of roots) {
              for (const file of await glob(`**/*.${lang === 'lua' ? 'lua' : 'py'}`, { cwd: root, nodir: true })) {
                const normalized = file.split('\\').join('/');
                if (!seen.has(normalized)) {
                  seen.add(normalized);
                  files.push(normalized);
                }
              }
            }
            return sendJson(res, 200, files.sort((a, b) => a.localeCompare(b)));
          }
          const relative = url.searchParams.get('path');
          if (!relative) return sendJson(res, 400, { error: 'Path required' });
          for (const root of roots) {
            const file = path.resolve(root, relative);
            // A path that climbs out of the examples folder is never served.
            if (file !== root && !file.startsWith(root + path.sep)) continue;
            if (fs.existsSync(file) && fs.statSync(file).isFile()) return sendJson(res, 200, { content: fs.readFileSync(file, 'utf8') });
          }
          return sendJson(res, 404, { error: 'File not found' });
        } catch (error) {
          console.error('[examples-api]', error);
          return sendJson(res, 500, { error: 'Failed to read examples' });
        }
      });
    }
  };
}

export default defineConfig({
  root: 'public',
  plugins: [htmlIncludesPlugin(path.resolve(__dirname, 'public')), examplesApiPlugin(__dirname)],
  build: {
    outDir: '../dist/public',
    emptyOutDir: true,
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/three/')) return 'vendor-three';
          if (id.includes('/monaco-editor/')) return 'vendor-monaco';
          if (id.includes('/blockly/')) return 'vendor-blockly';
          if (id.includes('/fengari-web/') || id.includes('/fengari/')) return 'vendor-fengari';
          return 'vendor';
        }
      }
    }
  },
  server: {
    host: '127.0.0.1',
    port: 3011,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3010',
        changeOrigin: true
      },
      '/api-docs': {
        target: 'http://127.0.0.1:3010',
        changeOrigin: true
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './public'),
      'three$': path.resolve(__dirname, './node_modules/three/build/three.module.js'),
      'three': path.resolve(__dirname, './node_modules/three')
    }
  },
  optimizeDeps: {
    include: ['three', 'fengari-web']
  }
});
