import esbuild from 'esbuild';
import { readFileSync } from 'node:fs';

const banner = readFileSync('src/header.js', 'utf8');
const OUTFILE = 'deleteDiscordMessages.user.js'; // repo root (like undiscord) for a clean install URL

await esbuild.build({
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  outfile: OUTFILE,
  banner: { js: banner },
  legalComments: 'none',
});
console.log(`[build] ${OUTFILE} written.`);
