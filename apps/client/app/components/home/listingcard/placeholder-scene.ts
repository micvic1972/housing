// ============================================================================
// placeholderScene
//
// Draws a small illustration (as an SVG data-URI) for listings that have no
// real photo yet. Three variants make a listing feel like it has 3 photos:
//   variant 0 = the building from outside
//   variant 1 = a room inside
//   variant 2 = the compound with its gate
//
// WHY THIS IS SAFE FOR HYDRATION:
// The server and the browser must build the EXACT same string. So this file
// uses only whole-number maths on the listing id. No Math.random, no Date,
// no toFixed, no locale formatting. Same id in = same string out, everywhere.
// ============================================================================

// Turn the listing id into a stable whole number.
function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function placeholderScene(
  id: string,
  isConstruction: boolean,
  variant: number = 0,
): string {
  const h = hashId(id);
  // Stay in the blue family (no warm colours), shifted a little per listing.
  const hue = 205 + (h % 30);

  const sky =
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="hsl(${hue},55%,16%)"/>` +
    `<stop offset="1" stop-color="hsl(${hue},58%,32%)"/>` +
    `</linearGradient></defs>` +
    `<rect width="400" height="300" fill="url(#g)"/>`;

  const lit = `hsl(${hue},85%,84%)`; // a lit window
  const dark = `hsl(${hue},32%,29%)`; // an unlit window
  const wall = `hsl(${hue},36%,20%)`;
  const ground = `hsl(${hue},42%,10%)`;

  let body = "";

  if (variant === 1) {
    // ---------------------------------------------------------------- ROOM
    body += `<rect width="400" height="300" fill="hsl(${hue},30%,18%)"/>`;
    body += `<rect y="220" width="400" height="80" fill="${ground}"/>`;
    // window with a cross bar
    body += `<rect x="250" y="50" width="100" height="100" rx="4" fill="${lit}" opacity=".9"/>`;
    body += `<rect x="298" y="50" width="4" height="100" fill="${wall}"/>`;
    body += `<rect x="250" y="98" width="100" height="4" fill="${wall}"/>`;
    if (isConstruction) {
      // unfinished room: bare floor, a paint bucket and a plank
      body += `<rect x="60" y="238" width="120" height="8" fill="${dark}"/>`;
      body += `<rect x="200" y="196" width="28" height="30" rx="3" fill="${dark}"/>`;
    } else {
      // bed: headboard, mattress, pillow
      body += `<rect x="34" y="140" width="12" height="82" rx="3" fill="${dark}"/>`;
      body += `<rect x="40" y="170" width="150" height="50" rx="6" fill="hsl(${hue},40%,32%)"/>`;
      body += `<rect x="50" y="158" width="44" height="18" rx="8" fill="${lit}" opacity=".85"/>`;
    }
  } else if (variant === 2) {
    // ------------------------------------------------------------ COMPOUND
    body += sky;
    body += `<rect x="110" y="${isConstruction ? 130 : 84}" width="180" height="${isConstruction ? 80 : 126}" rx="4" fill="${wall}"/>`;
    if (!isConstruction) {
      body += `<rect x="130" y="100" width="30" height="26" rx="3" fill="${lit}"/>`;
      body += `<rect x="185" y="100" width="30" height="26" rx="3" fill="${dark}"/>`;
      body += `<rect x="240" y="100" width="30" height="26" rx="3" fill="${lit}"/>`;
    }
    body += `<rect y="210" width="400" height="90" fill="${ground}"/>`;
    // perimeter wall
    body += `<rect y="176" width="400" height="34" fill="hsl(${hue},30%,24%)"/>`;
    // gate: two pillars and bars between them
    body += `<rect x="150" y="140" width="18" height="70" fill="${dark}"/>`;
    body += `<rect x="232" y="140" width="18" height="70" fill="${dark}"/>`;
    body += `<rect x="176" y="150" width="4" height="60" fill="${lit}" opacity=".7"/>`;
    body += `<rect x="192" y="150" width="4" height="60" fill="${lit}" opacity=".7"/>`;
    body += `<rect x="208" y="150" width="4" height="60" fill="${lit}" opacity=".7"/>`;
    body += `<rect x="224" y="150" width="4" height="60" fill="${lit}" opacity=".7"/>`;
    // small security post
    body += `<rect x="304" y="150" width="40" height="60" rx="3" fill="${wall}"/>`;
    body += `<rect x="314" y="162" width="20" height="16" rx="2" fill="${lit}"/>`;
  } else {
    // ------------------------------------------------------------- OUTSIDE
    body += sky;
    body += `<circle cx="320" cy="45" r="16" fill="${lit}" opacity=".85"/>`;
    // A building under construction is shorter and has fewer windows.
    const top = isConstruction ? 110 : 54;
    const height = 210 - top;
    body += `<rect x="85" y="${top}" width="230" height="${height}" rx="4" fill="${wall}"/>`;
    const rows = isConstruction ? [124, 168] : [64, 108, 152];
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < 4; c++) {
        const on = (h >> (r * 4 + c)) & 1;
        body += `<rect x="${100 + c * 50}" y="${rows[r]}" width="34" height="28" rx="3" fill="${on ? lit : dark}"/>`;
      }
    }
    if (isConstruction) {
      // scaffolding lines above the unfinished floor
      body += `<g stroke="${lit}" stroke-width="3" opacity=".5">` +
        `<line x1="90" y1="70" x2="90" y2="110"/>` +
        `<line x1="200" y1="70" x2="200" y2="110"/>` +
        `<line x1="310" y1="70" x2="310" y2="110"/>` +
        `<line x1="90" y1="80" x2="310" y2="80"/>` +
        `<line x1="90" y1="100" x2="310" y2="100"/></g>`;
    }
    body += `<rect y="210" width="400" height="90" fill="${ground}"/>`;
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">` +
    (variant === 2 ? "" : variant === 1 ? "" : "") + // sky is drawn inside body for 0 and 2
    body +
    `</svg>`;

  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}