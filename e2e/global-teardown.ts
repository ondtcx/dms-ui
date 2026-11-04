import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export default async function globalTeardown() {
  const backendDir = resolve(__dirname, '../../dms-backend');
  const script = resolve(backendDir, 'scripts/cleanup-test-data.mjs');
  if (!existsSync(script)) {
    console.warn(`Playwright cleanup skipped: ${script} not found`);
    return;
  }
  execFileSync(process.execPath, [script, '--confirm'], {
    cwd: backendDir,
    env: {
      ...process.env,
      DOTENV_CONFIG_PATH: resolve(backendDir, '.env'),
    },
    stdio: 'inherit',
  });
}
