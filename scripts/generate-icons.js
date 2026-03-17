/**
 * generate-icons.js
 *
 * Generates PWA icons for /public.
 * Run: npm run generate-icons
 * Requires: npm install canvas --save-dev
 */

const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

function generateIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Green rounded rect
  const r = size * 0.2;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fillStyle = "#16a34a";
  ctx.fill();

  // White dollar sign
  ctx.font = `bold ${size * 0.5}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("$", size / 2, size / 2);

  const outPath = path.join(__dirname, "..", "public", filename);
  fs.writeFileSync(outPath, canvas.toBuffer("image/png"));
  console.log(`✓ ${filename} (${size}x${size})`);
}

generateIcon(192, "icon-192.png");
generateIcon(512, "icon-512.png");

// Apple touch icon (180x180)
generateIcon(180, "apple-touch-icon.png");

console.log("\nDone! Icons written to /public");
