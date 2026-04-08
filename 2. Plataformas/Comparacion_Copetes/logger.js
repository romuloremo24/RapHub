const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'copeton.log');
const MAX_SIZE = 1024 * 1024; // 1MB
const MAX_FILES = 5;

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

function rotate() {
  try {
    const stat = fs.statSync(LOG_FILE);
    if (stat.size < MAX_SIZE) return;
    fs.renameSync(LOG_FILE, `${LOG_FILE}.${Date.now()}`);
    // Limpiar archivos viejos
    const files = fs.readdirSync(LOG_DIR)
      .filter(f => f.startsWith('copeton.log.'))
      .sort()
      .reverse();
    for (const f of files.slice(MAX_FILES)) {
      fs.unlinkSync(path.join(LOG_DIR, f));
    }
  } catch {}
}

function write(level, args) {
  const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
  const line = `[${new Date().toISOString()}] [${level}] ${msg}\n`;

  // Siempre a console
  if (level === 'ERROR') process.stderr.write(line);
  else process.stdout.write(line);

  // A archivo
  try {
    ensureLogDir();
    fs.appendFileSync(LOG_FILE, line);
    rotate();
  } catch {}
}

module.exports = {
  info: (...args) => write('INFO', args),
  warn: (...args) => write('WARN', args),
  error: (...args) => write('ERROR', args),
};
