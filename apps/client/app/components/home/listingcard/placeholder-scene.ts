// Generates a small illustrated "photo" for a listing with no real image yet. Same listing =
// same picture every time (seeded by its id). Once a real photo URL exists, the card uses that.

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function placeholderScene(id: string, isConstruction = false): string {
  const seed = hashSeed(id);
  const rand = (n: number) => {
    const x = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };

  const hue = 200 + Math.floor(rand(1) * 40);
  const sky = `hsl(${hue}, 55%, 16%)`;
  const skyLight = `hsl(${hue}, 58%, 32%)`;
  const wall = `hsl(${hue}, 36%, 20%)`;
  const lit = `hsl(${hue + 6}, 85%, 84%)`;
  const dim = `hsl(${hue}, 32%, 29%)`;
  const ground = `hsl(${hue}, 42%, 10%)`;

  const floors = isConstruction ? 3 : 4;
  const cols = 5;
  const w = 400, h = 300;
  const buildingW = 230, buildingX = (w - buildingW) / 2;
  const floorH = 44, top = 210 - floors * floorH;
  const colW = (buildingW - 30) / cols;

  let windows = "";
  for (let f = 0; f < floors; f++) {
    for (let c = 0; c < cols; c++) {
      const on = rand(f * 9 + c + 10) > 0.4;
      const x = buildingX + 15 + c * colW;
      const y = top + 10 + f * floorH;
      if (isConstruction && f === 0) {
        windows += `<rect x="${x}" y="${y}" width="${colW - 10}" height="28" rx="3" fill="none" stroke="${lit}" stroke-width="2" stroke-dasharray="5 4"/>`;
      } else {
        windows += `<rect x="${x}" y="${y}" width="${colW - 10}" height="28" rx="3" fill="${on ? lit : dim}"/>`;
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${sky}"/><stop offset="1" stop-color="${skyLight}"/>
    </linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
    <circle cx="${300 + rand(2) * 40}" cy="45" r="16" fill="${lit}" opacity=".85"/>
    <rect x="${buildingX}" y="${top}" width="${buildingW}" height="${floors * floorH}" rx="4" fill="${wall}"/>
    ${windows}
    <rect y="210" width="${w}" height="90" fill="${ground}"/>
    <circle cx="${buildingX - 26}" cy="196" r="20" fill="hsl(${hue + 120}, 32%, 18%)"/>
    <circle cx="${buildingX + buildingW + 26}" cy="200" r="17" fill="hsl(${hue + 120}, 32%, 16%)"/>
  </svg>`;

  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}
