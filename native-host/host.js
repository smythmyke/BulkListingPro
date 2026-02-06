#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;
console.log = (...args) => process.stderr.write('[LOG] ' + args.join(' ') + '\n');
console.warn = (...args) => process.stderr.write('[WARN] ' + args.join(' ') + '\n');
console.error = (...args) => process.stderr.write('[ERROR] ' + args.join(' ') + '\n');

process.stdin.on('readable', () => {
  let chunk;
  while ((chunk = process.stdin.read()) !== null) {
    handleInput(chunk);
  }
});

let inputBuffer = Buffer.alloc(0);

function handleInput(chunk) {
  inputBuffer = Buffer.concat([inputBuffer, chunk]);

  while (inputBuffer.length >= 4) {
    const messageLength = inputBuffer.readUInt32LE(0);

    if (inputBuffer.length < 4 + messageLength) {
      break;
    }

    const messageBuffer = inputBuffer.slice(4, 4 + messageLength);
    inputBuffer = inputBuffer.slice(4 + messageLength);

    try {
      const message = JSON.parse(messageBuffer.toString('utf8'));
      processMessage(message);
    } catch (err) {
      sendMessage({ type: 'ERROR', error: 'Invalid JSON: ' + err.message });
    }
  }
}

function sendMessage(message) {
  const messageString = JSON.stringify(message);
  const messageBuffer = Buffer.from(messageString, 'utf8');
  const header = Buffer.alloc(4);
  header.writeUInt32LE(messageBuffer.length, 0);

  process.stdout.write(header);
  process.stdout.write(messageBuffer);
}

async function processMessage(message) {
  const { type, payload } = message;

  switch (type) {
    case 'PING':
      sendMessage({ type: 'PONG', version: '2.0.0' });
      break;

    case 'READ_FILE':
      await handleReadFile(payload);
      break;

    case 'READ_FILES':
      await handleReadFiles(payload);
      break;

    case 'READ_SPREADSHEET':
      await handleReadSpreadsheet(payload);
      break;

    case 'LIST_DIRECTORY':
      await handleListDirectory(payload);
      break;

    default:
      sendMessage({ type: 'ERROR', error: 'Unknown message type: ' + type });
  }
}

async function handleReadFile(payload) {
  const { path: filePath, requestId } = payload || {};

  if (!filePath) {
    sendMessage({ type: 'FILE_ERROR', error: 'No path provided', requestId });
    return;
  }

  try {
    const resolvedPath = path.resolve(filePath);

    if (!fs.existsSync(resolvedPath)) {
      sendMessage({ type: 'FILE_ERROR', error: 'File not found', path: filePath, requestId });
      return;
    }

    const stats = fs.statSync(resolvedPath);
    if (stats.size > 50 * 1024 * 1024) {
      sendMessage({ type: 'FILE_ERROR', error: 'File too large (max 50MB)', path: filePath, requestId });
      return;
    }

    const data = fs.readFileSync(resolvedPath);
    const base64 = data.toString('base64');
    const mimeType = getMimeType(resolvedPath);

    sendMessage({
      type: 'FILE_DATA',
      path: filePath,
      data: `data:${mimeType};base64,${base64}`,
      mimeType,
      size: stats.size,
      requestId
    });
  } catch (err) {
    sendMessage({ type: 'FILE_ERROR', error: err.message, path: filePath, requestId });
  }
}

async function handleReadFiles(payload) {
  const { paths, requestId } = payload || {};

  if (!paths || !Array.isArray(paths)) {
    sendMessage({ type: 'FILES_ERROR', error: 'No paths array provided', requestId });
    return;
  }

  const results = [];

  for (const filePath of paths) {
    try {
      const resolvedPath = path.resolve(filePath);

      if (!fs.existsSync(resolvedPath)) {
        results.push({ path: filePath, error: 'File not found' });
        continue;
      }

      const stats = fs.statSync(resolvedPath);
      if (stats.size > 50 * 1024 * 1024) {
        results.push({ path: filePath, error: 'File too large (max 50MB)' });
        continue;
      }

      const data = fs.readFileSync(resolvedPath);
      const base64 = data.toString('base64');
      const mimeType = getMimeType(resolvedPath);

      results.push({
        path: filePath,
        data: `data:${mimeType};base64,${base64}`,
        mimeType,
        size: stats.size
      });
    } catch (err) {
      results.push({ path: filePath, error: err.message });
    }
  }

  sendMessage({ type: 'FILES_DATA', results, requestId });
}

async function handleReadSpreadsheet(payload) {
  const { path: filePath, requestId } = payload || {};

  if (!filePath) {
    sendMessage({ type: 'SPREADSHEET_ERROR', error: 'No path provided', requestId });
    return;
  }

  try {
    const resolvedPath = path.resolve(filePath);

    if (!fs.existsSync(resolvedPath)) {
      sendMessage({ type: 'SPREADSHEET_ERROR', error: 'File not found', path: filePath, requestId });
      return;
    }

    const ext = path.extname(resolvedPath).toLowerCase();

    if (ext === '.csv') {
      const content = fs.readFileSync(resolvedPath, 'utf8');
      const rows = parseCSV(content);
      sendMessage({ type: 'SPREADSHEET_DATA', path: filePath, rows, requestId });
    } else if (ext === '.xlsx' || ext === '.xls') {
      const XLSX = require('xlsx');
      const workbook = XLSX.readFile(resolvedPath);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet);
      sendMessage({ type: 'SPREADSHEET_DATA', path: filePath, rows, requestId });
    } else {
      sendMessage({ type: 'SPREADSHEET_ERROR', error: 'Unsupported file type', path: filePath, requestId });
    }
  } catch (err) {
    sendMessage({ type: 'SPREADSHEET_ERROR', error: err.message, path: filePath, requestId });
  }
}

function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return [];

  const headers = parseCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

async function handleListDirectory(payload) {
  const { path: dirPath, filter, requestId } = payload || {};

  if (!dirPath) {
    sendMessage({ type: 'DIRECTORY_ERROR', error: 'No path provided', requestId });
    return;
  }

  try {
    const resolvedPath = path.resolve(dirPath);

    if (!fs.existsSync(resolvedPath)) {
      sendMessage({ type: 'DIRECTORY_ERROR', error: 'Directory not found', path: dirPath, requestId });
      return;
    }

    const stats = fs.statSync(resolvedPath);
    if (!stats.isDirectory()) {
      sendMessage({ type: 'DIRECTORY_ERROR', error: 'Path is not a directory', path: dirPath, requestId });
      return;
    }

    let files = fs.readdirSync(resolvedPath);

    if (filter) {
      const filterLower = filter.toLowerCase();
      const extensions = filterLower.split(',').map(e => e.trim());
      files = files.filter(f => {
        const ext = path.extname(f).toLowerCase().replace('.', '');
        return extensions.includes(ext);
      });
    }

    const fileInfos = files.map(f => {
      const fullPath = path.join(resolvedPath, f);
      const fileStat = fs.statSync(fullPath);
      return {
        name: f,
        path: fullPath,
        isDirectory: fileStat.isDirectory(),
        size: fileStat.size,
        modified: fileStat.mtime.toISOString()
      };
    });

    sendMessage({ type: 'DIRECTORY_DATA', path: dirPath, files: fileInfos, requestId });
  } catch (err) {
    sendMessage({ type: 'DIRECTORY_ERROR', error: err.message, path: dirPath, requestId });
  }
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.psd': 'image/vnd.adobe.photoshop',
    '.ai': 'application/postscript',
    '.eps': 'application/postscript'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

sendMessage({ type: 'READY', version: '2.0.0' });
