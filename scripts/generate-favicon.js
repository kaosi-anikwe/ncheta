import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const svgPath = path.resolve("public/favicon.svg");
const icoPath = path.resolve("public/favicon.ico");

async function main() {
  try {
    // 1. Render SVG to 32x32 PNG buffer
    const pngBuffer = await sharp(svgPath)
      .resize(32, 32)
      .png()
      .toBuffer();

    const pngSize = pngBuffer.length;

    // 2. Create the 22-byte ICO header & directory entry
    const header = Buffer.alloc(22);
    
    // Icon Header (6 bytes)
    header.writeUInt16LE(0, 0);  // Reserved
    header.writeUInt16LE(1, 2);  // Type (1 = ICO)
    header.writeUInt16LE(1, 4);  // Image count (1)

    // Directory Entry (16 bytes)
    header.writeUInt8(32, 6);    // Width (32px)
    header.writeUInt8(32, 7);    // Height (32px)
    header.writeUInt8(0, 8);     // Color count (0 = no palette)
    header.writeUInt8(0, 9);     // Reserved
    header.writeUInt16LE(1, 10); // Color planes (1)
    header.writeUInt16LE(32, 12);// Bits per pixel (32)
    header.writeUInt32LE(pngSize, 14); // Size of PNG data
    header.writeUInt32LE(22, 18); // Offset of PNG data (22 bytes)

    // 3. Combine header and PNG data
    const icoBuffer = Buffer.concat([header, pngBuffer]);

    // 4. Write to public/favicon.ico
    fs.writeFileSync(icoPath, icoBuffer);
    console.log("Successfully generated public/favicon.ico!");
  } catch (error) {
    console.error("Error generating favicon.ico:", error);
    process.exit(1);
  }
}

main();
