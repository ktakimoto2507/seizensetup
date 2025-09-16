import sharp from "sharp";
import { mkdirSync } from "node:fs";

mkdirSync("public/icons", { recursive: true });

const src = "public/icon-source.png"; // ここに元画像
const outs = [
  { file: "public/icons/icon-192.png", size: 192 },
  { file: "public/icons/icon-512.png", size: 512 },
  { file: "public/icons/maskable-512.png", size: 512 }, // まずは同じでOK
];

for (const { file, size } of outs) {
  await sharp(src).resize(size, size, { fit: "cover" }).png().toFile(file);
  console.log("generated:", file);
}
