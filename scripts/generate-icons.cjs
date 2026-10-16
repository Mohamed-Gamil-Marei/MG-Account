const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Create a 256x256 PNG with an emerald gradient, document lines and badge
function createPng(width, height) {
  const bytesPerPixel = 4;
  const rowSize = width * bytesPerPixel + 1; // +1 for filter byte (0)
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * bytesPerPixel;
      
      // Rounded corner radius: 48px
      const r = 48;
      let inCorner = false;
      let cornerDist = 0;
      if (x < r && y < r) {
        cornerDist = Math.hypot(x - r, y - r);
        inCorner = cornerDist > r;
      } else if (x > width - r && y < r) {
        cornerDist = Math.hypot(x - (width - r), y - r);
        inCorner = cornerDist > r;
      } else if (x < r && y > height - r) {
        cornerDist = Math.hypot(x - r, y - (height - r));
        inCorner = cornerDist > r;
      } else if (x > width - r && y > height - r) {
        cornerDist = Math.hypot(x - (width - r), y - (height - r));
        inCorner = cornerDist > r;
      }

      if (inCorner) {
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
        continue;
      }

      // Default Emerald Background Gradient: #064e3b -> #047857
      let red = Math.floor(6 + (4 - 6) * (y / height));
      let green = Math.floor(78 + (120 - 78) * (y / height));
      let blue = Math.floor(59 + (87 - 59) * (y / height));
      let alpha = 255;

      // Circle in the middle (radius 90)
      const cx = width / 2;
      const cy = height / 2;
      const dCenter = Math.hypot(x - cx, y - cy);
      if (dCenter < 90) {
        red = 5;
        green = 150;
        blue = 105;
      }

      // Document lines (white)
      // Line 1: y 80 to 92, x 70 to 186
      if (y >= 80 && y <= 92 && x >= 70 && x <= 186) {
        red = 255; green = 255; blue = 255;
      }
      // Line 2: y 110 to 122, x 70 to 186
      if (y >= 110 && y <= 122 && x >= 70 && x <= 186) {
        red = 255; green = 255; blue = 255;
      }
      // Line 3: y 140 to 152, x 70 to 145
      if (y >= 140 && y <= 152 && x >= 70 && x <= 145) {
        red = 255; green = 255; blue = 255;
      }

      // Golden verification badge: circle at (175, 175) radius 30
      const dBadge = Math.hypot(x - 175, y - 175);
      if (dBadge <= 28) {
        red = 245;
        green = 158;
        blue = 11; // Amber #f59e0b
      }
      if (dBadge <= 28 && dBadge >= 25) {
        red = 255; green = 255; blue = 255;
      }

      rawData[pxOffset] = red;
      rawData[pxOffset + 1] = green;
      rawData[pxOffset + 2] = blue;
      rawData[pxOffset + 3] = alpha;
    }
  }

  // PNG chunks
  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = crc32(Buffer.concat([typeBuf, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let j = 0; j < 8; j++) {
        c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
      }
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdr = makeChunk('IHDR', ihdrData);
  const compressed = zlib.deflateSync(rawData);
  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

// Windows ICO format wrapper containing PNG bytes
function createIcoFromPng(pngBuffer, width, height) {
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // Reserved
  icoHeader.writeUInt16LE(1, 2); // Type 1 = ICO
  icoHeader.writeUInt16LE(1, 4); // Count of images = 1

  const entry = Buffer.alloc(16);
  entry.writeUInt8(width >= 256 ? 0 : width, 0);
  entry.writeUInt8(height >= 256 ? 0 : height, 1);
  entry.writeUInt8(0, 2); // Colors (0 = no palette)
  entry.writeUInt8(0, 3); // Reserved
  entry.writeUInt16LE(1, 4); // Color planes
  entry.writeUInt16LE(32, 6); // Bits per pixel
  entry.writeUInt32LE(pngBuffer.length, 8); // Image size in bytes
  entry.writeUInt32LE(22, 12); // Offset (6 header + 16 entry = 22)

  return Buffer.concat([icoHeader, entry, pngBuffer]);
}

const iconsDir = path.join(__dirname, '..', 'electron', 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

const png256 = createPng(256, 256);
fs.writeFileSync(path.join(iconsDir, 'icon.png'), png256);
console.log('Created icon.png (256x256)');

const ico = createIcoFromPng(png256, 256, 256);
fs.writeFileSync(path.join(iconsDir, 'icon.ico'), ico);
console.log('Created icon.ico');

// Also create 512x512 for macOS
const png512 = createPng(512, 512);
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), png512);
console.log('Created icon-512.png');
