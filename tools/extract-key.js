#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Usage: node extract-key.js <path-to-crx-file>

const crxPath = process.argv[2];

if (!crxPath) {
  console.log('Usage: node extract-key.js <path-to-crx-file>');
  console.log('');
  console.log('Download your extension .crx from:');
  console.log('https://clients2.google.com/service/update2/crx?response=redirect&prodversion=120.0&acceptformat=crx2,crx3&x=id%3D<YOUR_EXTENSION_ID>%26uc');
  process.exit(1);
}

const buffer = fs.readFileSync(crxPath);

// CRX3 format:
// - Magic number: "Cr24" (4 bytes)
// - Version: 3 (4 bytes, little-endian)
// - Header length (4 bytes, little-endian)
// - Header (protobuf)
// - ZIP content

const magic = buffer.slice(0, 4).toString();
if (magic !== 'Cr24') {
  console.error('Not a valid CRX file (magic:', magic, ')');
  process.exit(1);
}

const version = buffer.readUInt32LE(4);
console.log('CRX version:', version);

if (version === 2) {
  // CRX2 format
  const pubKeyLength = buffer.readUInt32LE(8);
  const sigLength = buffer.readUInt32LE(12);
  const pubKey = buffer.slice(16, 16 + pubKeyLength);

  const key = pubKey.toString('base64');
  console.log('\nPublic key (for manifest.json):');
  console.log(key);

  // Verify ID
  const hash = crypto.createHash('sha256').update(pubKey).digest('hex');
  const id = hash.slice(0, 32).split('').map(c => {
    const n = parseInt(c, 16);
    return String.fromCharCode('a'.charCodeAt(0) + n);
  }).join('');
  console.log('\nDerived extension ID:', id);

} else if (version === 3) {
  // CRX3 format
  const headerLength = buffer.readUInt32LE(8);
  const headerData = buffer.slice(12, 12 + headerLength);

  // CRX3 header is protobuf encoded
  // We need to parse it to find the signed_header_data
  // The public key is in signed_header_data.crx_id (which is sha256 of the key)
  // But the actual key is in the proof structure

  // Simple approach: look for the RSA public key marker in the header
  // DER-encoded RSA public keys start with 0x30 0x82

  let keyStart = -1;
  for (let i = 0; i < headerData.length - 4; i++) {
    // Look for ASN.1 SEQUENCE marker for RSA public key
    if (headerData[i] === 0x30 && headerData[i + 1] === 0x82) {
      const len = headerData.readUInt16BE(i + 2);
      if (len > 200 && len < 2000 && i + 4 + len <= headerData.length) {
        keyStart = i;
        break;
      }
    }
  }

  if (keyStart === -1) {
    console.log('Could not find public key in CRX3 header.');
    console.log('Header length:', headerLength);
    console.log('');
    console.log('Alternative: Try using Chrome Developer Dashboard to get the key,');
    console.log('or extract manually from the CRX file.');

    // Dump header for manual inspection
    const headerHex = headerData.slice(0, Math.min(500, headerData.length)).toString('hex');
    console.log('\nFirst 500 bytes of header (hex):');
    console.log(headerHex);
    process.exit(1);
  }

  const keyLen = headerData.readUInt16BE(keyStart + 2) + 4;
  const pubKey = headerData.slice(keyStart, keyStart + keyLen);

  const key = pubKey.toString('base64');
  console.log('\nPublic key (for manifest.json):');
  console.log(key);

  // Verify ID
  const hash = crypto.createHash('sha256').update(pubKey).digest('hex');
  const id = hash.slice(0, 32).split('').map(c => {
    const n = parseInt(c, 16);
    return String.fromCharCode('a'.charCodeAt(0) + n);
  }).join('');
  console.log('\nDerived extension ID:', id);

} else {
  console.error('Unknown CRX version:', version);
  process.exit(1);
}

console.log('\n---');
console.log('Add this to your manifest.json:');
console.log('"key": "<the-key-above>"');
