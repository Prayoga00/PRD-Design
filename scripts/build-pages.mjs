import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const apiDir = path.join(rootDir, 'src', 'app', 'api');
const backupDir = path.join(rootDir, '.api-bak');
const nextTypesDir = path.join(rootDir, '.next', 'types');
const nextDevTypesDir = path.join(rootDir, '.next', 'dev', 'types');

let movedApi = false;

try {
  if (fs.existsSync(backupDir)) {
    fs.rmSync(backupDir, { recursive: true, force: true });
  }
  if (fs.existsSync(apiDir)) {
    fs.renameSync(apiDir, backupDir);
    movedApi = true;
  }

  // Clear stale route validator types from prior non-export dev/build runs
  fs.rmSync(nextTypesDir, { recursive: true, force: true });
  fs.rmSync(nextDevTypesDir, { recursive: true, force: true });

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/PRD-Design';

  execSync('npx next build', {
    stdio: 'inherit',
    env: {
      ...process.env,
      GITHUB_PAGES: 'true',
      NEXT_PUBLIC_STATIC_EXPORT: 'true',
      NEXT_PUBLIC_BASE_PATH: basePath,
    },
  });
} finally {
  if (movedApi && fs.existsSync(backupDir)) {
    if (fs.existsSync(apiDir)) {
      fs.rmSync(apiDir, { recursive: true, force: true });
    }
    fs.renameSync(backupDir, apiDir);
  }
}
