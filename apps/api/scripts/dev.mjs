import { spawn } from 'node:child_process';

const apiUrl = `http://127.0.0.1:${process.env.API_PORT ?? 3333}/health`;

async function hasHealthyApi() {
  try {
    const response = await fetch(apiUrl, { signal: AbortSignal.timeout(1500) });
    return response.ok;
  } catch {
    return false;
  }
}

if (await hasHealthyApi()) {
  console.log(`[API] Instância existente reutilizada em ${apiUrl}.`);
  const timer = setInterval(() => undefined, 60_000);
  const stop = () => {
    clearInterval(timer);
    process.exit(0);
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
} else {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error('npm_execpath is unavailable.');
  const build = spawn(process.execPath, [npmCli, 'run', 'build'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: false
  });

  build.once('exit', (code) => {
    if (code !== 0) process.exit(code ?? 1);

    const api = spawn(process.execPath, ['dist/main.js'], {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: false
    });

    const stop = (signal) => {
      if (!api.killed) api.kill(signal);
    };
    process.once('SIGINT', () => stop('SIGINT'));
    process.once('SIGTERM', () => stop('SIGTERM'));
    api.once('exit', (apiCode) => process.exit(apiCode ?? 0));
  });
}
