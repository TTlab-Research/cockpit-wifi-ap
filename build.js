#!/usr/bin/env node

import esbuild from 'esbuild';
import { sassPlugin } from 'esbuild-sass-plugin';
import fs from 'fs';
import path from 'path';

const production = process.env.NODE_ENV === 'production';
const watchMode = !!process.env.ESBUILD_WATCH;

const nodePaths = ['pkg/lib'];

// Copy static files to dist
function copyPlugin() {
    return {
        name: 'copy-static',
        setup(build) {
            build.onEnd(() => {
                const distDir = 'dist';
                if (!fs.existsSync(distDir)) {
                    fs.mkdirSync(distDir, { recursive: true });
                }
                // Copy index.html
                fs.copyFileSync('src/index.html', path.join(distDir, 'index.html'));
                // Copy manifest.json
                fs.copyFileSync('src/manifest.json', path.join(distDir, 'manifest.json'));
                // Copy Python backend scripts
                const binSrc = 'src/bin';
                const binDst = path.join(distDir, 'bin');
                if (fs.existsSync(binSrc)) {
                    if (!fs.existsSync(binDst)) {
                        fs.mkdirSync(binDst, { recursive: true });
                    }
                    for (const f of fs.readdirSync(binSrc)) {
                        fs.copyFileSync(path.join(binSrc, f), path.join(binDst, f));
                        fs.chmodSync(path.join(binDst, f), 0o755);
                    }
                }
            });
        },
    };
}

function notifyEndPlugin() {
    return {
        name: 'notify-end',
        setup(build) {
            build.onEnd(result => {
                const time = new Date().toLocaleTimeString();
                if (result.errors.length > 0) {
                    console.error(`[${time}] Build failed with ${result.errors.length} error(s)`);
                } else {
                    console.log(`[${time}] Build succeeded`);
                }
            });
        },
    };
}

const context = await esbuild.context({
    bundle: true,
    entryPoints: ['./src/index.tsx'],
    external: ['*.woff', '*.woff2', '*.jpg', '*.svg', '../../assets*'],
    legalComments: 'external',
    loader: { ".js": "jsx", ".py": "text" },
    minify: production,
    nodePaths,
    outdir: 'dist',
    metafile: true,
    target: ['es2020'],
    plugins: [
        sassPlugin({ loadPaths: [...nodePaths, 'node_modules'] }),
        copyPlugin(),
        notifyEndPlugin(),
    ],
});

if (watchMode) {
    await context.watch();
    console.log('Watching for changes...');
} else {
    await context.rebuild();
    await context.dispose();
}
