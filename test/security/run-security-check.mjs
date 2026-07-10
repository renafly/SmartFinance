import { spawn } from 'node:child_process';

const isWindows = process.platform === 'win32';

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: isWindows,
      env: {
        ...process.env,
        ...options.env,
      },
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 'unknown'}`));
    });
  });
}

const checks = [
  {
    label: 'TypeScript app typecheck',
    command: 'npx',
    args: ['tsc', '--noEmit', '--pretty', 'false'],
  },
  {
    label: 'TypeScript test typecheck',
    command: 'npm',
    args: ['run', 'typecheck:test'],
  },
  {
    label: 'Jest unit and integration tests',
    command: 'npm',
    args: ['run', 'test:ci'],
  },
  {
    label: 'Web export and Playwright security smoke',
    command: 'npm',
    args: ['run', 'test:e2e:web'],
  },
  {
    label: 'Strict local Supabase security contracts',
    command: 'npm',
    args: ['run', 'test:supabase'],
    env: {
      SUPABASE_TEST_REQUIRED: '1',
      SUPABASE_SECURITY_CHECK: '1',
    },
  },
];

for (const check of checks) {
  console.log(`\n==> ${check.label}`);
  await run(check.command, check.args, { env: check.env });
}

console.log('\nSecurity check passed.');
