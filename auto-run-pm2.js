import { spawn } from 'child_process';
import process from 'process';

const botProcess = spawn('node', ['.'], {
  stdio: ['pipe', process.stdout, process.stderr]
});

setTimeout(() => {
  console.log('[Auto-Run] Selecting: Start existing client...');
  botProcess.stdin.write('\n');
}, 2000);

setTimeout(() => {
  console.log('[Auto-Run] Selecting: session...');
  botProcess.stdin.write('\n');
}, 4000);

botProcess.on('close', (code) => {
  console.log(`[Auto-Run] Process exited with code ${code}`);
  process.exit(code ?? 0);
});

