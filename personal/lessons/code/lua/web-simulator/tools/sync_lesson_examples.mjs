/**
 * The Lua and Python lesson libraries that /api/files serves live outside
 * this project (as siblings of `web-simulator/` in the wider lessons repo:
 * `../examples` and `../../python/examples`). A deploy that only ships the
 * `web-simulator/` folder never sees them, and the file browser falls back
 * to this project's own tiny bundled `examples/` set.
 *
 * Run this before packaging a deploy to vendor a fresh copy of both
 * libraries into `web-simulator/examples/` and `web-simulator/examples-python/`,
 * which server.ts already checks first. It is a no-op (with a warning) when
 * run somewhere the source folders aren't checked out, e.g. a CI job that
 * only clones this subfolder - the previously vendored copies are left as-is.
 *
 * This only ever adds/overwrites files that exist in the source lesson
 * library; it never deletes. `examples/` also holds a couple of files that
 * are unique to this project (not part of the lesson library), and a lesson
 * removed from the source since the last sync would otherwise vanish from
 * here too - the trade-off is a stale copy can outlive its source.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const targets = [
    {
        label: 'Lua examples',
        source: path.resolve(projectRoot, '..', 'examples'),
        dest: path.join(projectRoot, 'examples')
    },
    {
        label: 'Python examples',
        source: path.resolve(projectRoot, '..', '..', 'python', 'examples'),
        dest: path.join(projectRoot, 'examples-python')
    }
];

for (const { label, source, dest } of targets) {
    if (!fs.existsSync(source)) {
        console.warn(`[sync-examples] Skipping ${label}: source not found at ${source}`);
        continue;
    }

    fs.mkdirSync(dest, { recursive: true });
    fs.cpSync(source, dest, { recursive: true });
    console.log(`[sync-examples] Copied ${label}: ${source} -> ${dest}`);
}
