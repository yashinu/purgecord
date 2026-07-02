import esbuild from 'esbuild';
import { readFileSync, mkdirSync } from 'node:fs';

mkdirSync('dist', { recursive: true });
const banner = readFileSync('src/header.js', 'utf8');

await esbuild.build({
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  outfile: 'dist/deleteDiscordMessages.user.js',
  banner: { js: banner },
  legalComments: 'none',
});
console.log('[build] dist/deleteDiscordMessages.user.js yazıldı.');
