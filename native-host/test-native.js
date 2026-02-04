#!/usr/bin/env node
// Test script to simulate Native Messaging protocol

const { spawn } = require('child_process');
const path = require('path');

const hostPath = path.join(__dirname, 'host.js');
const host = spawn('node', [hostPath]);

let responseBuffer = Buffer.alloc(0);

host.stdout.on('data', (chunk) => {
  responseBuffer = Buffer.concat([responseBuffer, chunk]);

  while (responseBuffer.length >= 4) {
    const msgLen = responseBuffer.readUInt32LE(0);
    if (responseBuffer.length < 4 + msgLen) break;

    const msgData = responseBuffer.slice(4, 4 + msgLen);
    responseBuffer = responseBuffer.slice(4 + msgLen);

    const msg = JSON.parse(msgData.toString('utf8'));
    console.log('Received:', JSON.stringify(msg, null, 2));

    if (msg.type === 'READY') {
      console.log('\nNative host started successfully!');
      console.log('Sending PING message...\n');
      sendMessage({ type: 'PING' });
    } else if (msg.type === 'PONG') {
      console.log('Native messaging protocol working correctly!');
      host.kill();
      process.exit(0);
    }
  }
});

host.stderr.on('data', (data) => {
  console.error('STDERR:', data.toString());
});

host.on('error', (err) => {
  console.error('Failed to start host:', err.message);
  process.exit(1);
});

host.on('close', (code) => {
  if (code !== 0 && code !== null) {
    console.error('Host exited with code:', code);
  }
});

function sendMessage(msg) {
  const msgStr = JSON.stringify(msg);
  const msgBuf = Buffer.from(msgStr, 'utf8');
  const header = Buffer.alloc(4);
  header.writeUInt32LE(msgBuf.length, 0);
  host.stdin.write(header);
  host.stdin.write(msgBuf);
}

setTimeout(() => {
  console.error('Timeout - no response from native host');
  host.kill();
  process.exit(1);
}, 5000);
