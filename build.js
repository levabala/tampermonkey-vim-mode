#!/usr/bin/env bun

// Build script for bundling the userscript with bun
import { readFileSync } from 'fs';
import { resolve } from 'path';

const result = await Bun.build({
    entrypoints: ['./src/main.js'],
    outdir: './dist',
    target: 'browser',
    format: 'iife', // Immediately Invoked Function Expression for userscript
    minify: false, // Keep readable for userscript
    sourcemap: 'none',
});

if (!result.success) {
    console.error('Build failed');
    for (const message of result.logs) {
        console.error(message);
    }
    process.exit(1);
}

console.log('Build successful!');

// Post-process: wrap in IIFE and add userscript header
const setupContent = readFileSync('./src/setup.js', 'utf-8');
const headerMatch = setupContent.match(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==/);
const header = headerMatch ? headerMatch[0] : '';

const bundledContent = readFileSync('./dist/main.js', 'utf-8');

// Wrap the bundle in an IIFE and add the header
const finalContent = `${header}

(function() {
    'use strict';

${bundledContent}
})();
`;

await Bun.write('./dist/tampermonkey_vim_mode.js', finalContent);

// Also copy to root for backwards compatibility and tests
await Bun.write('./tampermonkey_vim_mode.js', finalContent);

console.log('Created dist/tampermonkey_vim_mode.js');
console.log('Copied to tampermonkey_vim_mode.js (for tests)');
