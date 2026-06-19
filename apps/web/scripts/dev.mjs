import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const webUrl = `http://127.0.0.1:${process.env.WEB_PORT ?? 3000}/login`;

async function hasHealthyWeb() {
  try {
    const response = await fetch(webUrl, { signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
}

if (await hasHealthyWeb()) {
  console.log(`[WEB] Instância existente reutilizada em ${webUrl}.`);
  const timer = setInterval(() => undefined, 60_000);
  const stop = () => {
    clearInterval(timer);
    process.exit(0);
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
} else {
  const nextCli = resolve(process.cwd(), '../../node_modules/next/dist/bin/next');
  const web = spawn(process.execPath, [nextCli, 'dev', '-p', process.env.WEB_PORT ?? '3000'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: false
  });

  const stop = (signal) => {
    if (!web.killed) web.kill(signal);
  };
  process.once('SIGINT', () => stop('SIGINT'));
  process.once('SIGTERM', () => stop('SIGTERM'));
  web.once('exit', (code) => process.exit(code ?? 0));
}
