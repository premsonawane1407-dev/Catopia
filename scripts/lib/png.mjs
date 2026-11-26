// A dependency-free PNG encoder (RGBA, 8 bit), plus helpers to scale and compose pictures for review sheets.
import { deflateSync } from "node:zlib";

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** @param {number} width @param {number} height @param {Uint8ClampedArray|Uint8Array|Buffer} rgba */
export function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const src = Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength);
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    src.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

/** A blank RGBA canvas filled with one colour. */
export function canvas(width, height, [r, g, b, a = 255]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) data.set([r, g, b, a], i * 4);
  return { width, height, data };
}

/** Draws `src` (RGBA, w x h region from sx, sy) onto `dst` at (dx, dy), enlarged by a whole number, with alpha blending. */
export function blit(dst, src, sx, sy, w, h, dx, dy, zoom = 1) {
  for (let y = 0; y < h * zoom; y++) {
    for (let x = 0; x < w * zoom; x++) {
      const px = dx + x;
      const py = dy + y;
      if (px < 0 || py < 0 || px >= dst.width || py >= dst.height) continue;
      const so = ((sy + Math.floor(y / zoom)) * src.width + sx + Math.floor(x / zoom)) * 4;
      const a = src.data[so + 3] / 255;
      if (a === 0) continue;
      const o = (py * dst.width + px) * 4;
      for (let c = 0; c < 3; c++) dst.data[o + c] = src.data[so + c] * a + dst.data[o + c] * (1 - a);
      dst.data[o + 3] = 255;
    }
  }
}

/** Fills a rectangle. */
export function rect(dst, x, y, w, h, [r, g, b, a = 255]) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (xx >= 0 && yy >= 0 && xx < dst.width && yy < dst.height) dst.data.set([r, g, b, a], (yy * dst.width + xx) * 4);
}
