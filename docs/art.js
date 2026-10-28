// Decorative print-style plates. Static markup only; no user text ever enters these strings.
let count = 0;
const palette = {
  hero: {paper:'#1e2b47', ink:'#e9d9b8'},
  steady: {paper:'#d9dee8', ink:'#1e2b47'},
  extinct: {paper:'#ecd8ce', ink:'#b33a27'},
  changing: {paper:'#d3e2dc', ink:'#2b6659'}
};

function dots(id, ink, size, r) {
  return `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="${ink}"/></pattern>`;
}
function grain(id) {
  return `<pattern id="${id}" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".6" fill="#000" opacity=".06"/></pattern>`;
}

const scenes = {
  hero: (k, {ink}) => `
    <g fill="none" stroke="${ink}" stroke-width="2">
      <path d="M140 300C280 300 300 175 392 175"/>
      <path d="M140 300C330 300 560 355 724 355"/>
      <path d="M140 300C420 300 620 120 935 150"/>
      <path d="M1010 132L1120 70M1018 168L1150 160M1004 204L1100 262" stroke-dasharray="3 7"/>
    </g>
    <circle cx="140" cy="300" r="9" fill="${ink}"/>
    <circle cx="512" cy="175" r="122" fill="url(#d1-${k})"/>
    <circle cx="512" cy="175" r="82" fill="none" stroke="${ink}" stroke-width="2"/>
    <circle cx="512" cy="175" r="42" fill="${ink}"/>
    <clipPath id="c-${k}"><rect x="600" y="200" width="420" height="155"/></clipPath>
    <circle cx="815" cy="355" r="96" fill="url(#d2-${k})" clip-path="url(#c-${k})"/>
    <path d="M690 355H940M716 374H914M748 392H882M782 408H848" stroke="${ink}" stroke-width="2"/>
    <circle cx="975" cy="165" r="54" fill="url(#d3-${k})"/>
    <circle cx="975" cy="165" r="54" fill="none" stroke="${ink}" stroke-width="2" stroke-dasharray="5 6"/>`,
  steady: (k, {ink}) => `
    <rect x="130" y="40" width="340" height="340" fill="none" stroke="${ink}" stroke-width="2"/>
    <circle cx="300" cy="210" r="150" fill="url(#d1-${k})"/>
    <circle cx="300" cy="210" r="108" fill="#d9dee8"/>
    <circle cx="300" cy="210" r="108" fill="none" stroke="${ink}" stroke-width="2"/>
    <circle cx="300" cy="210" r="76" fill="url(#d3-${k})"/>
    <circle cx="300" cy="210" r="34" fill="${ink}"/>`,
  extinct: (k, {ink}) => `
    <clipPath id="c-${k}"><rect x="0" y="0" width="600" height="262"/></clipPath>
    <circle cx="300" cy="262" r="150" fill="url(#d1-${k})" clip-path="url(#c-${k})"/>
    <circle cx="300" cy="262" r="96" fill="${ink}" clip-path="url(#c-${k})"/>
    <path d="M60 262H540" stroke="${ink}" stroke-width="2"/>
    <g stroke="${ink}" stroke-width="2"><path d="M150 288H450"/><path d="M190 312H410" opacity=".75"/><path d="M228 336H372" opacity=".5"/><path d="M262 360H338" opacity=".3"/></g>`,
  changing: (k, {ink}) => `
    <g fill="none" stroke="${ink}" stroke-width="2">
      <path d="M70 360C170 360 190 250 270 250S360 140 440 120"/>
      <path d="M270 250C340 250 380 300 470 290"/>
      <path d="M190 330C260 330 300 380 380 372"/>
      <path d="M440 120L520 70M440 120L540 140" stroke-dasharray="3 6"/>
    </g>
    <circle cx="70" cy="360" r="8" fill="${ink}"/>
    <rect x="300" y="40" width="240" height="96" rx="48" fill="url(#d2-${k})"/>
    <path d="M348 40H420V136H348A48 48 0 0 1 348 40Z" fill="${ink}"/>
    <rect x="300" y="40" width="240" height="96" rx="48" fill="none" stroke="${ink}" stroke-width="2"/>
    <circle cx="470" cy="290" r="34" fill="url(#d1-${k})"/>
    <circle cx="380" cy="372" r="22" fill="none" stroke="${ink}" stroke-width="2" stroke-dasharray="4 5"/>`
};

export function illustration(kind) {
  const k = `${kind}-${++count}`;
  const colors = palette[kind] || palette.hero;
  const [w, h] = kind === 'hero' ? [1200, 460] : [600, 420];
  const box = document.createElement('div');
  box.className = 'art';
  box.innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <defs>${dots(`d1-${k}`, colors.ink, 8, 2.3)}${dots(`d2-${k}`, colors.ink, 6, 1.9)}${dots(`d3-${k}`, colors.ink, 11, 1.5)}${grain(`g-${k}`)}</defs>
    <rect width="${w}" height="${h}" fill="${colors.paper}"/><rect width="${w}" height="${h}" fill="url(#g-${k})"/>
    ${(scenes[kind] || scenes.hero)(k, colors)}</svg>`;
  return box;
}
