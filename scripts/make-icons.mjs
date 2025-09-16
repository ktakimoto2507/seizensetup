import sharp from "sharp";
import { mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });

const svg = (size, maskable = false) => {
  const bg = "#0F172A";
  const ring = maskable ? '<circle cx="500" cy="500" r="470" fill="none" stroke="#94A3B8" stroke-width="35"/>' : "";
  const fontSize = maskable ? 400 : 460;
  return `
<svg width="${size}" height="${size}" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
  <rect width="1000" height="1000" fill="${bg}"/>
  ${ring}
  <text x="500" y="500" text-anchor="middle" dominant-baseline="central"
    font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    font-size="${fontSize}" font-weight="700" fill="#FFFFFF">SS</text>
</svg>`;
};

const make = async (file, size, maskable = false) => {
  const buffer = Buffer.from(svg(size, maskable));
  await sharp(buffer).png().toFile(file);
  console.log("generated", file);
};

await make("public/icons/icon-512.png", 512);
await make("public/icons/icon-192.png", 192);
await make("public/icons/maskable-512.png", 512, true);
