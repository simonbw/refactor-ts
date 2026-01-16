import { createInterface } from 'readline';
import { existsSync, mkdirSync, copyFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Find the project root (where npm install was run from)
const projectRoot = process.env.INIT_CWD || process.cwd();
const skillDest = join(projectRoot, '.claude', 'commands', 'refactor.md');

// Find our skill file
const __dirname = dirname(fileURLToPath(import.meta.url));
const skillSrc = join(__dirname, '..', 'skill', 'refactor.md');

// Skip if already exists or if we're in the package itself
if (existsSync(skillDest) || projectRoot === dirname(__dirname)) {
  process.exit(0);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });

rl.question('Install Claude Code skill for refactor-ts? (y/N) ', (answer) => {
  rl.close();
  if (answer.toLowerCase() === 'y') {
    mkdirSync(dirname(skillDest), { recursive: true });
    copyFileSync(skillSrc, skillDest);
    console.log(`Installed skill to ${skillDest}`);
  }
});
