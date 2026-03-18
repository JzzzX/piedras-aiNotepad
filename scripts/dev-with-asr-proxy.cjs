#!/usr/bin/env node

const { spawn } = require('node:child_process');
const path = require('node:path');
const { loadEnvConfig } = require('@next/env');

const cwd = path.resolve(__dirname, '..');
loadEnvConfig(cwd);
const nextBin = path.join(cwd, 'node_modules', 'next', 'dist', 'bin', 'next');

function spawnChild(label, command, args) {
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    stdio: 'inherit',
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    if (typeof code === 'number' && code !== 0) {
      console.error(`[${label}] exited with code ${code}`);
      process.exit(code);
    }
  });

  return child;
}

const children = [
  spawnChild('next', process.execPath, [nextBin, 'dev', '--webpack']),
];

if ((process.env.ASR_MODE || '').toLowerCase() === 'doubao') {
  children.push(spawnChild('asr-proxy', process.execPath, [path.join(__dirname, 'asr-proxy.cjs')]));
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    for (const child of children) {
      if (!child.killed) {
        child.kill(signal);
      }
    }
  });
}
