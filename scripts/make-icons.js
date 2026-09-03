import fs from 'fs';
import zlib from 'zlib';

function createSolidPng(width, height, r, g, b, a = 255) {
  // PNG signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth
  ihdrData.writeUInt8(6, 9); // RGBA color type
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Raw image data: height lines, each begins with filter byte 0
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      // Create a nice gradient with mountain peak & sun highlight
      const cx = width / 2;
      const cy = height / 2;
      const distFromCenter = Math.hypot(x - cx, y - cy) / (width / 2);

      // Default dark green gradient
      let pr = Math.floor(6 + (y / height) * 20);
      let pg = Math.floor(78 + (y / height) * 40);
      let pb = Math.floor(59 + (y / height) * 40);

      // Mountain triangle in center
      const peakY = height * 0.3;
      const baseY = height * 0.8;
      const halfW = (y - peakY) * 0.8;
      if (y >= peakY && y <= baseY && Math.abs(x - cx) <= halfW) {
        // Mountain body
        pr = 4;
        pg = 44;
        pb = 34;

        // Snow top
        if (y <= peakY + (baseY - peakY) * 0.28) {
          pr = 240;
          pg = 249;
          pb = 255;
        }
      }

      // Checkmark circle badge
      const badgeX = cx;
      const badgeY = height * 0.72;
      const badgeR = width * 0.16;
      const dBadge = Math.hypot(x - badgeX, y - badgeY);
      if (dBadge <= badgeR) {
        if (dBadge >= badgeR - width * 0.02) {
          // White border
          pr = 255;
          pg = 255;
          pb = 255;
        } else {
          // Bright Emerald
          pr = 16;
          pg = 185;
          pb = 129;
        }
      }

      rawData[pixelOffset] = pr;
      rawData[pixelOffset + 1] = pg;
      rawData[pixelOffset + 2] = pb;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(8 + length + 4);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crcTarget = chunk.subarray(4, 8 + length);
  const crc = crc32(crcTarget);
  chunk.writeUInt32BE(crc, 8 + length);
  return chunk;
}

const p192 = createSolidPng(192, 192);
const p512 = createSolidPng(512, 512);

fs.writeFileSync('public/icon-192.png', p192);
fs.writeFileSync('public/icon-512.png', p512);
fs.writeFileSync('public/icon-maskable.png', p512);
fs.writeFileSync('public/apple-touch-icon.png', p192);
console.log('Icons generated successfully!');
