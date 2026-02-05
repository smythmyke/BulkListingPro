#!/usr/bin/env node

// Redirect console.log to stderr to avoid corrupting Native Messaging protocol
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;
console.log = (...args) => process.stderr.write('[LOG] ' + args.join(' ') + '\n');
console.warn = (...args) => process.stderr.write('[WARN] ' + args.join(' ') + '\n');
console.error = (...args) => process.stderr.write('[ERROR] ' + args.join(' ') + '\n');

const { createListing } = require('./src/listing');
const { connectCDP, disconnectCDP } = require('./src/cdp');
const config = require('./config/default');
const { AbortError, setPaused, setSkip, setCancel, reset: resetAbort } = require('./src/abort');

let cdpClient = null;

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
      sendMessage({ type: 'PONG', version: '1.0.0' });
      break;

    case 'CONNECT':
      await handleConnect(payload);
      break;

    case 'DISCONNECT':
      await handleDisconnect();
      break;

    case 'START_UPLOAD':
      await handleStartUpload(payload);
      break;

    case 'PAUSE':
      handlePause();
      break;

    case 'RESUME':
      handleResume();
      break;

    case 'CANCEL':
      handleCancel();
      break;

    case 'SKIP':
      handleSkip();
      break;

    default:
      sendMessage({ type: 'ERROR', error: 'Unknown message type: ' + type });
  }
}

async function handleConnect(payload) {
  const { port = 9222, host = 'localhost' } = payload || {};

  try {
    cdpClient = await connectCDP({ host, port });
    sendMessage({ type: 'CONNECTED', success: true });
  } catch (err) {
    sendMessage({
      type: 'CONNECTION_ERROR',
      success: false,
      error: err.message,
      hint: 'Make sure Chrome is running with --remote-debugging-port=9222'
    });
  }
}

async function handleDisconnect() {
  try {
    await disconnectCDP(cdpClient);
    cdpClient = null;
    sendMessage({ type: 'DISCONNECTED', success: true });
  } catch (err) {
    sendMessage({ type: 'ERROR', error: err.message });
  }
}

let isCancelled = false;

function handlePause() {
  setPaused(true);
  sendMessage({ type: 'PAUSED' });
}

function handleResume() {
  setPaused(false);
  sendMessage({ type: 'RESUMED' });
}

function handleCancel() {
  isCancelled = true;
  setCancel(true);
  sendMessage({ type: 'CANCELLED' });
}

function handleSkip() {
  setSkip(true);
  setPaused(false);
  sendMessage({ type: 'SKIPPING' });
}

async function handleStartUpload(payload) {
  const { listings } = payload;

  if (!cdpClient) {
    sendMessage({
      type: 'ERROR',
      error: 'Not connected to Chrome. Send CONNECT first.'
    });
    return;
  }

  if (!listings || !Array.isArray(listings) || listings.length === 0) {
    sendMessage({ type: 'ERROR', error: 'No listings provided' });
    return;
  }

  isCancelled = false;
  resetAbort();

  const results = {
    total: listings.length,
    success: 0,
    failed: 0,
    details: []
  };

  sendMessage({
    type: 'UPLOAD_STARTED',
    total: listings.length
  });

  for (let i = 0; i < listings.length; i++) {
    if (isCancelled) {
      sendMessage({ type: 'UPLOAD_CANCELLED', results });
      return;
    }

    const listing = listings[i];

    sendMessage({
      type: 'LISTING_STARTED',
      index: i,
      total: listings.length,
      title: listing.title
    });

    try {
      const onVerificationRequired = (verificationType) => {
        sendMessage({
          type: 'VERIFICATION_REQUIRED',
          index: i,
          total: listings.length,
          title: listing.title,
          verificationType
        });
      };

      const result = await createListing(cdpClient, listing, { onVerificationRequired });

      if (result.success) {
        results.success++;
        results.details.push({
          index: i,
          title: listing.title,
          status: 'success'
        });

        sendMessage({
          type: 'LISTING_COMPLETE',
          index: i,
          total: listings.length,
          title: listing.title,
          success: true
        });
      } else if (result.verificationRequired) {
        results.failed++;
        results.details.push({
          index: i,
          title: listing.title,
          status: 'verification_timeout',
          error: result.error
        });

        sendMessage({
          type: 'LISTING_ERROR',
          index: i,
          total: listings.length,
          title: listing.title,
          error: result.error,
          verificationRequired: true
        });
      } else {
        results.failed++;
        results.details.push({
          index: i,
          title: listing.title,
          status: 'failed',
          error: result.error
        });

        sendMessage({
          type: 'LISTING_ERROR',
          index: i,
          total: listings.length,
          title: listing.title,
          error: result.error
        });
      }
    } catch (err) {
      if (err instanceof AbortError) {
        if (err.reason === 'skip') {
          setSkip(false);
          results.failed++;
          results.details.push({
            index: i,
            title: listing.title,
            status: 'skipped'
          });
          sendMessage({
            type: 'LISTING_SKIPPED',
            index: i,
            total: listings.length,
            title: listing.title
          });
          continue;
        } else if (err.reason === 'cancel') {
          isCancelled = true;
          sendMessage({ type: 'UPLOAD_CANCELLED', results });
          return;
        }
      }

      results.failed++;
      results.details.push({
        index: i,
        title: listing.title,
        status: 'failed',
        error: err.message
      });

      sendMessage({
        type: 'LISTING_ERROR',
        index: i,
        total: listings.length,
        title: listing.title,
        error: err.message
      });
    }

    if (i < listings.length - 1) {
      const jitter = Math.random() * config.automation.delayJitter;
      const { interruptibleDelay } = require('./src/abort');
      try {
        await interruptibleDelay(config.automation.delayBetweenListings + jitter);
      } catch (abortErr) {
        if (abortErr instanceof AbortError && abortErr.reason === 'cancel') {
          isCancelled = true;
          sendMessage({ type: 'UPLOAD_CANCELLED', results });
          return;
        }
      }
    }
  }

  sendMessage({
    type: 'UPLOAD_COMPLETE',
    results
  });
}

sendMessage({ type: 'READY', version: '1.0.0' });
