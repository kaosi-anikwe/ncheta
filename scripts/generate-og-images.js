import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const distDir = path.resolve("dist");
const ogOutputDir = path.join(distDir, "og");

// Ensure the dist/og directory exists
if (!fs.existsSync(ogOutputDir)) {
  fs.mkdirSync(ogOutputDir, { recursive: true });
}

// Load the actual logo.svg content
const logoSvgPath = path.resolve("public/logo.svg");
const logoSvgContent = fs.readFileSync(logoSvgPath, "utf-8");
// Extract only the inner elements (everything inside the outer <svg>...</svg>)
const innerLogoSvg = logoSvgContent
  .replace(/<svg[^>]*>/i, "")
  .replace(/<\/svg>/i, "");

// Recursive function to get all HTML files in a directory
function getHtmlFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== "og" && file !== "pagefind") { // skip output and search indexes
        getHtmlFiles(filePath, files);
      }
    } else if (file.endsWith(".html")) {
      files.push(filePath);
    }
  }
  return files;
}

// Unescape standard HTML entities (to prevent double-encoding like &amp;amp;)
function unescapeHtml(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

// Helper to escape XML special chars for SVG text injection
function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

// Wrap text block into lines based on a max character threshold
function wrapText(text, maxChars) {
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + word).length > maxChars) {
      lines.push(currentLine.trim());
      currentLine = word + " ";
    } else {
      currentLine += word + " ";
    }
  }
  if (currentLine) lines.push(currentLine.trim());
  return lines;
}

async function processHtmlFile(filePath) {
  let html = fs.readFileSync(filePath, "utf-8");

  // Check if this page requires a generated OG image
  if (!html.includes("PLACEHOLDER_OG_IMAGE")) {
    return;
  }

  // 1. Extract Title from <title> tag
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  let title = titleMatch ? titleMatch[1] : "Ncheta Magazine";
  // Clean up standard site name suffixes from the display title
  title = title.replace(/\s*\|\s*Ncheta\s*Magazine/i, "").trim();
  title = unescapeHtml(title);

  // 2. Extract Description from meta tags
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/i) ||
                    html.match(/<meta[^>]*content=["'](.*?)["'][^>]*name=["']description["']/i);
  let description = descMatch ? descMatch[1] : "African art news, academia, interviews, and exhibitions.";
  description = unescapeHtml(description);

  // 3. Generate a clean URL slug from the relative output path
  const relativePath = path.relative(distDir, filePath);
  let slug = relativePath
    .replace(/\\/g, "-")
    .replace(/\//g, "-")
    .replace(/index\.html$/, "")
    .replace(/\.html$/, "")
    .replace(/-+$/, "")
    .toLowerCase();

  if (!slug || slug === "") {
    slug = "home";
  }

  // 4. Wrap Title & Description dynamically
  const titleLines = wrapText(title, 28); // Wrap titles at 28 chars to fit page bounds
  const descLines = wrapText(description, 55);

  let titleHtml = "";
  let dividerY = 340;
  let descStartY = 390;

  if (titleLines.length === 1) {
    titleHtml = `<text x="600" y="300" font-family="'Cinzel', Georgia, serif" font-weight="bold" font-size="56" fill="#181717" text-anchor="middle">${escapeXml(titleLines[0])}</text>`;
    dividerY = 345;
    descStartY = 400;
  } else if (titleLines.length === 2) {
    titleHtml = `
      <text x="600" y="270" font-family="'Cinzel', Georgia, serif" font-weight="bold" font-size="52" fill="#181717" text-anchor="middle">${escapeXml(titleLines[0])}</text>
      <text x="600" y="325" font-family="'Cinzel', Georgia, serif" font-weight="bold" font-size="52" fill="#181717" text-anchor="middle">${escapeXml(titleLines[1])}</text>
    `;
    dividerY = 365;
    descStartY = 420;
  } else {
    titleHtml = `
      <text x="600" y="240" font-family="'Cinzel', Georgia, serif" font-weight="bold" font-size="44" fill="#181717" text-anchor="middle">${escapeXml(titleLines[0])}</text>
      <text x="600" y="295" font-family="'Cinzel', Georgia, serif" font-weight="bold" font-size="44" fill="#181717" text-anchor="middle">${escapeXml(titleLines[1])}</text>
      <text x="600" y="350" font-family="'Cinzel', Georgia, serif" font-weight="bold" font-size="44" fill="#181717" text-anchor="middle">${escapeXml(titleLines[2])}</text>
    `;
    dividerY = 385;
    descStartY = 440;
  }

  // 5. Render the brand-compliant SVG template using actual logo.svg vectors & custom font stack
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <defs>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&amp;family=Inter:wght@400;500;700&amp;display=swap');
        </style>
      </defs>

      <!-- Cotton canvas background -->
      <rect width="1200" height="630" fill="#e7d7b6" />
      
      <!-- Elegant Noir framing border -->
      <rect x="30" y="30" width="1140" height="570" fill="none" stroke="#181717" stroke-width="2" />
      <rect x="40" y="40" width="1120" height="550" fill="none" stroke="#181717" stroke-width="1" stroke-dasharray="8 4" opacity="0.3" />

      <!-- Cherry Red accent corners -->
      <line x1="30" y1="60" x2="30" y2="30" stroke="#650606" stroke-width="6" />
      <line x1="30" y1="30" x2="60" y2="30" stroke="#650606" stroke-width="6" />
      <line x1="1170" y1="570" x2="1170" y2="600" stroke="#650606" stroke-width="6" />
      <line x1="1140" y1="600" x2="1170" y2="600" stroke="#650606" stroke-width="6" />

      <!-- Centered actual logo.svg graphics -->
      <svg x="463" y="70" width="274" height="94" viewBox="48.7 51.6 274.1 93.7">
        ${innerLogoSvg}
      </svg>

      <!-- Page Title -->
      ${titleHtml}
      
      <!-- Horizontal Cherry divider -->
      <line x1="450" y1="${dividerY}" x2="750" y2="${dividerY}" stroke="#650606" stroke-width="2" />

      <!-- Page Description -->
      <g font-family="'Inter', system-ui, -apple-system, sans-serif" font-size="24" fill="#181717" opacity="0.75" text-anchor="middle">
        ${descLines.slice(0, 3).map((line, i) => `<text x="600" y="${descStartY + i * 36}">${escapeXml(line)}</text>`).join("")}
      </g>

      <!-- Footer URL -->
      <text x="600" y="555" font-family="'Inter', system-ui, -apple-system, sans-serif" font-weight="500" font-size="16" fill="#181717" opacity="0.4" text-anchor="middle" letter-spacing="4">WWW.NCHETAMAGAZINE.COM</text>
    </svg>
  `;

  // 6. Convert SVG buffer to PNG and write to dist/og/
  const imageFilename = `${slug}.png`;
  const imagePath = path.join(ogOutputDir, imageFilename);
  await sharp(Buffer.from(svg))
    .png()
    .toFile(imagePath);

  // 7. Update HTML to reference the generated image
  const ogImageUrl = `/og/${imageFilename}`;
  html = html.replace(/PLACEHOLDER_OG_IMAGE/g, ogImageUrl);
  fs.writeFileSync(filePath, html, "utf-8");

  console.log(`[OG Generator] Rendered ${relativePath} -> /og/${imageFilename}`);
}

async function main() {
  try {
    if (!fs.existsSync(distDir)) {
      console.error("Error: dist/ folder does not exist. Run 'npm run build' first.");
      process.exit(1);
    }

    const htmlFiles = getHtmlFiles(distDir);
    console.log(`Scanning build output for missing OG images (${htmlFiles.length} files)...`);
    
    for (const file of htmlFiles) {
      await processHtmlFile(file);
    }

    console.log("OG image generation process completed successfully!");
  } catch (err) {
    console.error("Fatal error during OG generation:", err);
    process.exit(1);
  }
}

main();
