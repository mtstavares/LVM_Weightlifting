import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(scriptDir, '..');
const workspaceDir = resolve(apiDir, '..', '..');
const rootEnvPath = resolve(workspaceDir, '.env');

if (existsSync(rootEnvPath)) {
  const envFile = readFileSync(rootEnvPath, 'utf8');
  for (const line of envFile.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

const prismaCli = resolve(workspaceDir, 'node_modules', 'prisma', 'build', 'index.js');
const child = spawn(process.execPath, [prismaCli, ...process.argv.slice(2)], {
  cwd: apiDir,
  stdio: 'inherit',
  shell: false,
  env: process.env
});

child.once('exit', (code) => process.exit(code ?? 0));
