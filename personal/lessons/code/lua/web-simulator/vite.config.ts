import fs from 'node:fs';
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

export default defineConfig({
  root: 'public',
  plugins: [htmlIncludesPlugin(path.resolve(__dirname, 'public'))],
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
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api-docs': {
        target: 'http://localhost:3000',
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
