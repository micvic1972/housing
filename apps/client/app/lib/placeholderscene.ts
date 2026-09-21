// Ported from the reference HTML mockup's `scene()` function. Draws a
// deterministic, abstract building illustration as an inline SVG data URI.
// There are no real photos yet, so every listing gets a unique-looking but
// reproducible placeholder based on its `seed` — same listing, same image,
// every time.

const HUES = [212, 204, 220, 198, 226, 208, 216, 200, 214];

function rand(seed: number, variant: number, n: number): number {
  const x = Math.sin(seed * 97.13 + variant * 13.7 + n * 7.31) * 10000;
  return x - Math.floor(x);
}

export function placeholderScene(seed: number, variant: 0 | 1 | 2, isConstruction: boolean): string {
  const r = (n: number) => rand(seed, variant, n);
  const h = HUES[seed % HUES.length];
  const lit = `hsl(${h + 8}, 90%, 82%)`;
  const dim = `hsl(${h}, 34%, 30%)`;
  const wall = `hsl(${h}, 38%, 21%)`;
  const ground = `hsl(${h}, 45%, 9%)`;

  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 640" preserveAspectRatio="xMidYMid slice">`;
  s += `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${h},55%,15%)"/><stop offset="1" stop-color="hsl(${h},58%,33%)"/></linearGradient></defs>`;
  s += `<rect width="800" height="640" fill="url(#g)"/>`;

  if (variant === 0) {
    s += `<circle cx="${600 + r(1) * 100}" cy="${90 + r(2) * 40}" r="34" fill="hsl(${h},80%,90%)" opacity=".92"/>`;
    const floors = isConstruction ? 3 : 4;
    const bw = 430 + r(3) * 90;
    const bx = (800 - bw) / 2;
    const fh = 104;
    const top = 520 - floors * fh;
    s += `<rect x="${bx}" y="${top}" width="${bw}" height="${floors * fh}" rx="6" fill="${wall}"/>`;
    const cols = 5;
    const cw = (bw - 56) / cols;
    for (let f = 0; f < floors; f++) {
      for (let c = 0; c < cols; c++) {
        const on = r(f * 9 + c + 10) > 0.42;
        const isDoor = isConstruction && f === 0;
        s += `<rect x="${bx + 28 + c * cw}" y="${top + 20 + f * fh}" width="${cw - 22}" height="62" rx="5" fill="${isDoor ? "none" : on ? lit : dim}" ${isDoor ? `stroke="${lit}" stroke-width="3" stroke-dasharray="8 6"` : ""}/>`;
      }
    }
    s += `<rect x="${400 - 34}" y="${520 - 78}" width="68" height="78" rx="6" fill="hsl(${h},60%,40%)"/>`;
    if (isConstruction) {
      for (let k = 0; k <= cols; k++) {
        s += `<line x1="${bx - 10 + (k * (bw + 20)) / cols}" y1="${top - 30}" x2="${bx - 10 + (k * (bw + 20)) / cols}" y2="520" stroke="${lit}" stroke-width="3" opacity=".55"/>`;
      }
      for (let q = 0; q <= floors + 1; q++) {
        s += `<line x1="${bx - 10}" y1="${top - 30 + q * (fh + 8)}" x2="${bx + bw + 10}" y2="${top - 30 + q * (fh + 8)}" stroke="${lit}" stroke-width="3" opacity=".55"/>`;
      }
      s += `<g stroke="${lit}" stroke-width="7" fill="none"><line x1="700" y1="520" x2="700" y2="120"/><line x1="560" y1="120" x2="790" y2="120"/><line x1="610" y1="120" x2="610" y2="200"/></g>`;
    }
    s += `<rect y="520" width="800" height="120" fill="${ground}"/>`;
    s += `<circle cx="${bx - 60}" cy="480" r="46" fill="hsl(${h + 120},35%,20%)"/><circle cx="${bx + bw + 60}" cy="488" r="38" fill="hsl(${h + 120},35%,18%)"/>`;
  } else if (variant === 1) {
    s += `<rect width="800" height="640" fill="hsl(${h},36%,19%)"/><rect y="470" width="800" height="170" fill="hsl(${h},40%,12%)"/>`;
    const wx = 90 + r(4) * 40;
    s += `<rect x="${wx}" y="90" width="230" height="230" rx="10" fill="${lit}" opacity=".9"/><line x1="${wx + 115}" y1="90" x2="${wx + 115}" y2="320" stroke="${wall}" stroke-width="6"/><line x1="${wx}" y1="205" x2="${wx + 230}" y2="205" stroke="${wall}" stroke-width="6"/>`;
    s += `<rect x="380" y="330" width="330" height="140" rx="14" fill="hsl(${h},55%,42%)"/><rect x="380" y="300" width="90" height="60" rx="14" fill="hsl(${h},30%,86%)"/><rect x="380" y="470" width="330" height="26" fill="hsl(${h},40%,10%)"/>`;
    s += `<circle cx="740" cy="250" r="20" fill="${lit}"/><rect x="734" y="270" width="12" height="80" fill="${dim}"/>`;
  } else {
    s += `<circle cx="${140 + r(5) * 60}" cy="100" r="30" fill="hsl(${h},80%,90%)" opacity=".9"/>`;
    s += `<rect x="120" y="230" width="560" height="260" rx="6" fill="${wall}"/>`;
    for (let a = 0; a < 6; a++) {
      for (let b = 0; b < 2; b++) {
        s += `<rect x="${150 + a * 88}" y="${255 + b * 110}" width="56" height="64" rx="5" fill="${r(a * 3 + b + 30) > 0.4 ? lit : dim}"/>`;
      }
    }
    s += `<rect y="490" width="800" height="150" fill="${ground}"/><rect y="560" width="800" height="8" fill="hsl(${h},30%,24%)"/>`;
    s += `<g fill="hsl(${h},45%,32%)"><rect x="60" y="360" width="20" height="150"/><rect x="330" y="360" width="20" height="150"/><rect x="60" y="380" width="290" height="10"/><rect x="60" y="440" width="290" height="10"/></g>`;
    s += `<circle cx="640" cy="440" r="52" fill="hsl(${h + 120},35%,20%)"/><rect x="632" y="470" width="16" height="50" fill="hsl(${h},30%,16%)"/>`;
    if (isConstruction) {
      s += `<g stroke="${lit}" stroke-width="6" fill="none"><line x1="720" y1="490" x2="720" y2="110"/><line x1="580" y1="110" x2="790" y2="110"/></g>`;
    }
  }
  s += `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(s)}`;
}