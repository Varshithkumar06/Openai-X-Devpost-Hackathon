const { spawn, execSync } = require('child_process');
const path = require('path');

console.log('==================================================');
console.log('         DRIVESPHERE CONCURRENT LAUNCHER');
console.log('==================================================\n');

function freePort(port) {
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano | findstr :${port}`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
      });
      const lines = output.trim().split('\n');
      const pids = new Set();
      for (const line of lines) {
        if (!line.includes('LISTENING')) continue;
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && pid !== String(process.pid)) {
          pids.add(pid);
        }
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
          console.log(`[Launcher] Cleaned stale listener on port ${port} (PID ${pid})`);
        } catch (_) {}
      }
    }
  } catch (_) {}
}

freePort(3000);
freePort(5000);

console.log('[Launcher] Starting Node.js server (Port 3000)...');
const nodeProcess = spawn('node', ['server.js'], {
  cwd: __dirname,
  stdio: ['inherit', 'pipe', 'pipe']
});

const pythonBin = process.env.PYTHON_PATH || (process.platform === 'win32' ? 'python' : 'python3');
console.log(`[Launcher] Starting Flask auth server (Port 5000) using ${pythonBin}...`);
const pythonProcess = spawn(pythonBin, ['app.py'], {
  cwd: path.join(__dirname, 'server'),
  env: { ...process.env, PORT: '5000' },
  stdio: ['inherit', 'pipe', 'pipe']
});

function prefixOutput(stream, prefix, colorCode) {
  let buffer = '';
  stream.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();
    lines.forEach((line) => {
      if (line.trim() !== '') {
        console.log(`\x1b[${colorCode}m${prefix}\x1b[0m ${line}`);
      }
    });
  });
}

prefixOutput(nodeProcess.stdout, '[Node]', '36');
prefixOutput(nodeProcess.stderr, '[Node ERR]', '31');
prefixOutput(pythonProcess.stdout, '[Flask]', '32');
prefixOutput(pythonProcess.stderr, '[Flask ERR]', '31');

let isShuttingDown = false;
function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('\n[Launcher] Shutting down all servers...');

  if (process.platform === 'win32') {
    if (nodeProcess && nodeProcess.pid) {
      try { execSync(`taskkill /F /T /PID ${nodeProcess.pid}`, { stdio: 'ignore' }); } catch (_) {}
    }
    if (pythonProcess && pythonProcess.pid) {
      try { execSync(`taskkill /F /T /PID ${pythonProcess.pid}`, { stdio: 'ignore' }); } catch (_) {}
    }
    process.exit(0);
  } else {
    nodeProcess.kill('SIGTERM');
    pythonProcess.kill('SIGTERM');
    setTimeout(() => {
      try { nodeProcess.kill('SIGKILL'); } catch (_) {}
      try { pythonProcess.kill('SIGKILL'); } catch (_) {}
      process.exit(0);
    }, 1500);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

nodeProcess.on('exit', (code) => {
  if (!isShuttingDown) {
    console.log(`[Launcher] Node process exited with code ${code}`);
    shutdown();
  }
});

pythonProcess.on('exit', (code) => {
  if (!isShuttingDown) {
    console.log(`[Launcher] Flask process exited with code ${code}. Node.js dashboard server remains active.`);
  }
});
