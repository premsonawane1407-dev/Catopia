// Cuts the 4:5 product gallery images used by the Store from the user-supplied toolkit photos.
// Run from the repo root: node scripts/build-store-gallery.mjs
// Needs `sharp` (installed alongside Next.js). Originals stay in references/; outputs go to public/images/store/gallery/.
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const config = JSON.parse(await readFile(path.join(root, "app/community-preview/store-gallery.json"), "utf8"));
const outDir = path.join(root, "public/images/store/gallery");
await mkdir(outDir, { recursive: true });

const SIZES = [
  { suffix: "", width: 840, quality: 80 },
  { suffix: "-card", width: 420, quality: 78 },
  { suffix: "-thumb", width: 120, quality: 74 },
];

for (const crop of config.crops) {
  const source = path.join(root, config.sources[crop.source]);
  const meta = await sharp(source).metadata();
  const sourceWidth = meta.width ?? 0;
  const sourceHeight = meta.height ?? 0;
  const height = Math.min(crop.h, sourceHeight, Math.floor(sourceWidth / 0.8));
  const width = Math.round(height * 0.8);
  const left = Math.max(0, Math.min(sourceWidth - width, Math.round(crop.cx - width / 2)));
  const top = Math.max(0, Math.min(sourceHeight - height, Math.round(crop.cy - height / 2)));
  const region = { left, top, width, height };
  const mainWidth = Math.min(SIZES[0].width, Math.round(width * 1.7));

  for (const size of SIZES) {
    const outWidth = Math.min(size.width, mainWidth);
    await sharp(source)
      .extract(region)
      .resize({ width: outWidth, height: Math.round(outWidth * 1.25), kernel: "lanczos3" })
      .sharpen({ sigma: 0.6 })
      .webp({ quality: size.quality })
      .toFile(path.join(outDir, `${crop.id}${size.suffix}.webp`));
  }
  console.log(`${crop.id.padEnd(18)} ${width}x${height} from ${crop.source} -> ${mainWidth}px`);
}
