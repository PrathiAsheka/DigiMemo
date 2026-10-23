// Generates demo "product photos" for the seed: a simple drawn product shot and a
// rating-label sticker (model, serial, date) for each piece of equipment. Rendered from
// SVG to JPEG with sharp so they behave exactly like photos a user would upload.
import sharp from "sharp";

export type ProductKind =
  | "fridge" | "washer" | "oven" | "dishwasher" | "ac" | "tv" | "heater" | "solar" | "tank" | "pump"
  | "generator" | "ups" | "server" | "coffee" | "hood" | "forklift" | "door" | "extinguisher" | "router" | "box";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const STEEL = "#d9dee2", DARK = "#2f3a40", MID = "#8b979e", GLASS = "#9fd3e8", ACCENT = "#059669";

function drawing(kind: ProductKind): string {
  switch (kind) {
    case "fridge":
      return `<rect x="200" y="70" width="240" height="440" rx="18" fill="${STEEL}" stroke="${MID}" stroke-width="4"/>
        <line x1="200" y1="230" x2="440" y2="230" stroke="${MID}" stroke-width="4"/>
        <rect x="410" y="110" width="10" height="80" rx="5" fill="${DARK}"/><rect x="410" y="260" width="10" height="120" rx="5" fill="${DARK}"/>`;
    case "washer":
    case "dishwasher":
      return `<rect x="170" y="110" width="300" height="360" rx="20" fill="#f3f5f6" stroke="${MID}" stroke-width="4"/>
        <rect x="170" y="110" width="300" height="70" rx="20" fill="${STEEL}"/>
        <circle cx="230" cy="145" r="14" fill="${DARK}"/><rect x="290" y="135" width="120" height="20" rx="6" fill="${ACCENT}"/>
        ${kind === "washer"
          ? `<circle cx="320" cy="320" r="105" fill="${DARK}"/><circle cx="320" cy="320" r="80" fill="${GLASS}" opacity="0.85"/>`
          : `<rect x="200" y="210" width="240" height="230" rx="10" fill="${STEEL}"/><rect x="290" y="225" width="60" height="10" rx="5" fill="${DARK}"/>`}`;
    case "oven":
      return `<rect x="150" y="130" width="340" height="320" rx="16" fill="${DARK}"/>
        <rect x="150" y="130" width="340" height="60" rx="16" fill="${MID}"/>
        ${[200, 250, 390, 440].map((x) => `<circle cx="${x}" cy="160" r="14" fill="${STEEL}"/>`).join("")}
        <rect x="185" y="215" width="270" height="200" rx="12" fill="#1c2327"/><rect x="205" y="235" width="230" height="140" rx="8" fill="#f59e0b" opacity="0.35"/>`;
    case "ac":
      return `<rect x="110" y="220" width="420" height="130" rx="40" fill="#f8fafb" stroke="${MID}" stroke-width="4"/>
        <rect x="140" y="310" width="360" height="14" rx="7" fill="${STEEL}"/><circle cx="480" cy="255" r="7" fill="${ACCENT}"/>
        ${[0, 1, 2].map((i) => `<path d="M${200 + i * 110} 390 q 20 30 0 60" stroke="${GLASS}" stroke-width="8" fill="none" stroke-linecap="round"/>`).join("")}`;
    case "tv":
      return `<rect x="90" y="150" width="460" height="270" rx="12" fill="${DARK}"/><rect x="105" y="165" width="430" height="240" rx="6" fill="#1e3a5f"/>
        <path d="M105 360 L250 250 L330 320 L410 260 L535 360 V405 H105Z" fill="${ACCENT}" opacity="0.6"/>
        <rect x="280" y="420" width="80" height="20" fill="${MID}"/><rect x="220" y="440" width="200" height="12" rx="6" fill="${MID}"/>`;
    case "heater":
    case "tank":
      return `<rect x="225" y="${kind === "tank" ? 150 : 80}" width="190" height="${kind === "tank" ? 330 : 400}" rx="90" fill="${kind === "tank" ? "#5b8f75" : "#f4f6f7"}" stroke="${MID}" stroke-width="4"/>
        ${kind === "heater" ? `<rect x="295" y="150" width="50" height="70" rx="8" fill="${STEEL}"/><circle cx="320" cy="185" r="16" fill="${DARK}"/><rect x="270" y="480" width="16" height="40" fill="${MID}"/><rect x="354" y="480" width="16" height="40" fill="${MID}"/>` : [220, 300, 380].map((y) => `<line x1="225" y1="${y}" x2="415" y2="${y}" stroke="#46775e" stroke-width="6"/>`).join("")}`;
    case "solar":
      return `<g transform="translate(320 300) skewX(-14)">${[0, 1, 2, 3].map((c) => [0, 1, 2].map((r) =>
        `<rect x="${-220 + c * 112}" y="${-150 + r * 102}" width="104" height="94" fill="#1f3b73" stroke="#9fb3d9" stroke-width="3"/>`).join("")).join("")}</g>`;
    case "pump":
      return `<rect x="140" y="270" width="230" height="140" rx="20" fill="#2563eb"/><circle cx="420" cy="340" r="90" fill="#1d4ed8"/>
        <rect x="400" y="210" width="40" height="60" fill="${MID}"/><rect x="150" y="410" width="360" height="24" rx="6" fill="${DARK}"/>`;
    case "generator":
      return `<rect x="110" y="200" width="420" height="230" rx="14" fill="#eab308"/><rect x="140" y="230" width="230" height="150" rx="8" fill="#a16207"/>
        ${[250, 280, 310, 340].map((y) => `<line x1="160" y1="${y}" x2="350" y2="${y}" stroke="#facc15" stroke-width="6"/>`).join("")}
        <rect x="400" y="240" width="100" height="70" rx="6" fill="${DARK}"/><rect x="100" y="430" width="440" height="22" rx="6" fill="${DARK}"/>`;
    case "ups":
    case "server":
      return `<rect x="210" y="${kind === "server" ? 70 : 150}" width="220" height="${kind === "server" ? 440 : 330}" rx="10" fill="#1f2937"/>
        ${(kind === "server" ? [100, 160, 220, 280, 340, 400, 460] : [190, 240]).map((y) => `<rect x="230" y="${y}" width="180" height="${kind === "server" ? 40 : 30}" rx="4" fill="#374151"/><circle cx="395" cy="${y + 15}" r="5" fill="#22c55e"/>`).join("")}
        ${kind === "ups" ? `<rect x="250" y="300" width="140" height="60" rx="6" fill="#0ea5e9" opacity="0.8"/>` : ""}`;
    case "coffee":
      return `<rect x="150" y="120" width="340" height="340" rx="22" fill="#b91c1c"/><rect x="180" y="150" width="280" height="90" rx="10" fill="${STEEL}"/>
        <rect x="230" y="250" width="40" height="40" fill="${DARK}"/><rect x="370" y="250" width="40" height="40" fill="${DARK}"/>
        <rect x="215" y="350" width="70" height="60" rx="8" fill="#f8fafc"/><rect x="355" y="350" width="70" height="60" rx="8" fill="#f8fafc"/>
        <rect x="140" y="460" width="360" height="20" rx="6" fill="${DARK}"/>`;
    case "hood":
      return `<path d="M260 90 H380 V220 L500 330 H140 L260 220Z" fill="${STEEL}" stroke="${MID}" stroke-width="4"/>
        <rect x="140" y="330" width="360" height="30" fill="${MID}"/>${[190, 250, 310, 370, 430].map((x) => `<rect x="${x}" y="338" width="30" height="14" fill="${DARK}"/>`).join("")}`;
    case "forklift":
      return `<rect x="170" y="250" width="220" height="150" rx="16" fill="#f59e0b"/><path d="M210 250 V150 H330 L360 250" fill="none" stroke="${DARK}" stroke-width="12"/>
        <rect x="400" y="120" width="16" height="300" fill="${DARK}"/><rect x="416" y="370" width="110" height="14" fill="${DARK}"/>
        <circle cx="220" cy="420" r="40" fill="${DARK}"/><circle cx="350" cy="420" r="40" fill="${DARK}"/>`;
    case "door":
      return `<rect x="120" y="110" width="400" height="380" fill="${STEEL}" stroke="${MID}" stroke-width="4"/>
        ${Array.from({ length: 11 }, (_, i) => `<line x1="120" y1="${140 + i * 32}" x2="520" y2="${140 + i * 32}" stroke="${MID}" stroke-width="3"/>`).join("")}`;
    case "extinguisher":
      return `<rect x="260" y="170" width="120" height="320" rx="50" fill="#dc2626"/><rect x="290" y="120" width="60" height="60" fill="${DARK}"/>
        <path d="M350 140 q 90 10 80 120" stroke="${DARK}" stroke-width="12" fill="none"/><rect x="275" y="260" width="90" height="100" rx="8" fill="#fef2f2"/>`;
    case "router":
      return `<rect x="150" y="300" width="340" height="100" rx="24" fill="#f8fafc" stroke="${MID}" stroke-width="4"/>
        ${[220, 290, 360, 430].map((x) => `<circle cx="${x}" cy="350" r="7" fill="${ACCENT}"/>`).join("")}
        <line x1="210" y1="300" x2="180" y2="160" stroke="${DARK}" stroke-width="10" stroke-linecap="round"/><line x1="430" y1="300" x2="460" y2="160" stroke="${DARK}" stroke-width="10" stroke-linecap="round"/>`;
    default:
      return `<rect x="170" y="150" width="300" height="300" rx="20" fill="${STEEL}" stroke="${MID}" stroke-width="4"/>`;
  }
}

/** A product shot: the item on a soft background with its make and model. */
export async function productPhoto(kind: ProductKind, title: string, subtitle: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef7f3"/><stop offset="1" stop-color="#d6ebe2"/></linearGradient></defs>
    <rect width="640" height="640" fill="url(#bg)"/>
    <ellipse cx="320" cy="530" rx="230" ry="22" fill="#000" opacity="0.08"/>
    ${drawing(kind)}
    <rect x="0" y="560" width="640" height="80" fill="#064e3b" opacity="0.92"/>
    <text x="28" y="595" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700" fill="#ecfdf5">${esc(title)}</text>
    <text x="28" y="625" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#a7f3d0">${esc(subtitle)}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toBuffer();
}

/** A rating-plate sticker, as a user would photograph it to remember model and serial. */
export async function labelPhoto(brand: string, fields: [string, string][]) {
  const rows = fields
    .map(([k, v], i) => `<text x="70" y="${250 + i * 58}" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#475569">${esc(k)}</text>
      <text x="270" y="${250 + i * 58}" font-family="Consolas, 'Courier New', monospace" font-size="26" font-weight="700" fill="#0f172a">${esc(v)}</text>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640">
    <rect width="640" height="640" fill="#9aa5ab"/>
    <g transform="rotate(-3 320 320)">
      <rect x="40" y="110" width="560" height="${180 + fields.length * 58}" rx="14" fill="#fbfbf7"/>
      <rect x="40" y="110" width="560" height="80" rx="14" fill="#1f2937"/><rect x="40" y="170" width="560" height="20" fill="#1f2937"/>
      <text x="70" y="163" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700" fill="#fff">${esc(brand.toUpperCase())}</text>
      ${rows}
      <g transform="translate(70 ${215 + fields.length * 58})">${Array.from({ length: 46 }, (_, i) => `<rect x="${i * 10}" y="0" width="${i % 3 === 0 ? 6 : 3}" height="36" fill="#111"/>`).join("")}</g>
    </g>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toBuffer();
}
