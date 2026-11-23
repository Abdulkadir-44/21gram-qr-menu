/* ==========================================================
   HAYALET ORDUSU ÇİZİMLERİ — 200×200 tek renk silüet (beyaz dolgu, detaylar maskeyle oyuk).
   Sahnede krem renge boyanır, arkasına koyu gölge kopyası düşer (eski figürlerle aynı dil).
   Gövdeler sağa bakar; atış kolu ayrı parça (ARM) olarak omuzdan döner.
   ========================================================== */
const svg = (holes, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 200 200"><defs><mask id="m"><rect width="200" height="200" fill="#fff"/>${holes}</mask></defs><g fill="#fff" stroke="#fff" mask="url(#m)">${body}</g></svg>`;

/* ortak parçalar: bacaklar + ayakkabılar, sarkan arka kol, kızgın gözler, sırıtan ağız */
const LEGS = (y = 150) => `<rect x="82" y="${y}" width="10" height="${184 - y}" rx="5" stroke="none"/><rect x="108" y="${y}" width="10" height="${184 - y}" rx="5" stroke="none"/>
  <ellipse cx="83" cy="187" rx="14" ry="7" stroke="none"/><ellipse cx="117" cy="187" rx="14" ry="7" stroke="none"/>`;
const BACK_ARM = (x, y) => `<path d="M${x} ${y} L${x - 16} ${y + 26}" fill="none" stroke-width="10" stroke-linecap="round"/><circle cx="${x - 18}" cy="${y + 30}" r="9" stroke="none"/>`;
const FACE = (y, gap = 13, my = 0) => `
  <circle cx="${100 - gap}" cy="${y}" r="7.5" fill="#000" stroke="none"/><circle cx="${100 + gap}" cy="${y}" r="7.5" fill="#000" stroke="none"/>
  <circle cx="${100 - gap + 2}" cy="${y + 1}" r="3.2" fill="#fff" stroke="none"/><circle cx="${100 + gap + 2}" cy="${y + 1}" r="3.2" fill="#fff" stroke="none"/>
  <path d="M${100 - gap - 9} ${y - 13} L${100 - gap + 6} ${y - 8} M${100 + gap + 9} ${y - 13} L${100 + gap - 6} ${y - 8}" stroke="#000" stroke-width="4.5" stroke-linecap="round" fill="none"/>
  ${my ? `<path d="M88 ${my} q12 9 24 0" stroke="#000" stroke-width="4.5" stroke-linecap="round" fill="none"/>` : ''}`;

export const ARMY_SVG = {
  burgerMan: svg(
    `${FACE(86, 14)}<path d="M86 139 q14 9 28 0" stroke="#000" stroke-width="4.5" stroke-linecap="round" fill="none"/>
     <rect x="40" y="107" width="120" height="3.5" fill="#000"/><rect x="40" y="124" width="120" height="3" fill="#000"/>
     <ellipse cx="80" cy="66" rx="4" ry="2.2" fill="#000"/><ellipse cx="100" cy="60" rx="4" ry="2.2" fill="#000"/><ellipse cx="121" cy="67" rx="4" ry="2.2" fill="#000" transform="rotate(20 121 67)"/>`,
    `${LEGS(146)}${BACK_ARM(58, 118)}
     <rect x="56" y="125" width="88" height="24" rx="11" stroke="none"/>
     <rect x="51" y="110" width="98" height="15" rx="7" stroke="none"/>
     <path d="M54 108 C54 50 146 50 146 108 Z" stroke="none"/>`),
  friesMan: svg(
    `${FACE(116, 12, 134)}<rect x="60" y="94" width="80" height="3.5" fill="#000"/>`,
    `${LEGS(148)}${BACK_ARM(70, 112)}
     <rect x="72" y="40" width="10" height="60" rx="3" stroke="none" transform="rotate(-12 77 98)"/><rect x="86" y="32" width="10" height="68" rx="3" stroke="none" transform="rotate(-4 91 98)"/>
     <rect x="100" y="30" width="10" height="70" rx="3" stroke="none" transform="rotate(4 105 98)"/><rect x="114" y="38" width="10" height="62" rx="3" stroke="none" transform="rotate(12 119 98)"/>
     <path d="M64 96 H136 L127 150 H73 Z" stroke="none"/>`),
  cocktailMan: svg(
    `${FACE(80, 12, 96)}<circle cx="132" cy="50" r="4" fill="#000"/>`,
    `${LEGS(152)}
     <path d="M70 92 L52 112" fill="none" stroke-width="10" stroke-linecap="round"/><circle cx="50" cy="116" r="9" stroke="none"/>
     <path d="M46 62 H154 L100 118 Z" stroke="none"/><rect x="95" y="114" width="10" height="34" stroke="none"/><ellipse cx="100" cy="151" rx="26" ry="6" stroke="none"/>
     <path d="M112 72 L134 40" fill="none" stroke-width="4"/><circle cx="132" cy="50" r="10" stroke="none"/>`),
  beerMan: svg(
    `${FACE(106, 12, 126)}<rect x="68" y="86" width="56" height="3" fill="#000"/>`,
    `${LEGS(152)}${BACK_ARM(64, 112)}
     <rect x="66" y="74" width="60" height="80" rx="8" stroke="none"/>
     <path d="M66 96 h-10 a14 14 0 0 0 0 36 h10" fill="none" stroke-width="10"/>
     <circle cx="76" cy="72" r="12" stroke="none"/><circle cx="96" cy="66" r="14" stroke="none"/><circle cx="116" cy="72" r="12" stroke="none"/>`),
  cupMan: svg(
    `${FACE(110, 12, 128)}<rect x="60" y="92" width="80" height="3" fill="#000"/><rect x="60" y="138" width="80" height="3" fill="#000"/>`,
    `${LEGS(152)}${BACK_ARM(70, 108)}
     <path d="M68 72 H132 L123 154 H77 Z" stroke="none"/>
     <rect x="60" y="60" width="80" height="13" rx="6" stroke="none"/><rect x="72" y="50" width="56" height="11" rx="5" stroke="none"/>`),
  icedMan: svg(
    `${FACE(112, 12, 130)}<rect x="80" y="66" width="16" height="16" rx="4" fill="#000" transform="rotate(-10 88 74)"/><rect x="103" y="70" width="15" height="15" rx="4" fill="#000" transform="rotate(14 110 77)"/>`,
    `${LEGS(152)}${BACK_ARM(72, 110)}
     <path d="M70 56 H130 L123 156 H77 Z" stroke="none"/>
     <path d="M116 22 L106 64" fill="none" stroke-width="9" stroke-linecap="round"/>`),
  /* atış kolu: üst uç omuz (pivot), alt uçta eldiven */
  armT: svg(``, `<path d="M100 10 L100 148" fill="none" stroke-width="20" stroke-linecap="round"/><circle cx="100" cy="164" r="24" stroke="none"/>`),
  /* mermiler */
  pBurger: svg(`<rect x="30" y="96" width="140" height="6" fill="#000"/><rect x="30" y="122" width="140" height="5" fill="#000"/>`,
    `<path d="M40 98 C40 40 160 40 160 98 Z" stroke="none"/><rect x="34" y="102" width="132" height="20" rx="10" stroke="none"/><rect x="40" y="127" width="120" height="28" rx="12" stroke="none"/>`),
  pFry: svg(``, `<rect x="84" y="20" width="32" height="160" rx="8" stroke="none" transform="rotate(20 100 100)"/>`),
  pCherry: svg(`<circle cx="84" cy="128" r="10" fill="#000"/>`, `<circle cx="98" cy="132" r="46" stroke="none"/><path d="M100 88 Q110 40 146 26" fill="none" stroke-width="9" stroke-linecap="round"/>`),
  pCap: svg(`<circle cx="100" cy="100" r="40" fill="none" stroke="#000" stroke-width="8"/>`,
    `<path d="M100 30 L112 42 L129 36 L134 53 L152 56 L148 74 L162 86 L150 100 L162 114 L148 126 L152 144 L134 147 L129 164 L112 158 L100 170 L88 158 L71 164 L66 147 L48 144 L52 126 L38 114 L50 100 L38 86 L52 74 L48 56 L66 53 L71 36 L88 42 Z" stroke="none"/>`),
  pBean: svg(`<path d="M100 44 Q80 100 100 156" stroke="#000" stroke-width="10" fill="none"/>`, `<ellipse cx="100" cy="100" rx="44" ry="60" stroke="none"/>`),
  pIce: svg(`<path d="M66 70 L92 64" stroke="#000" stroke-width="9" stroke-linecap="round"/>`, `<rect x="44" y="44" width="112" height="112" rx="22" stroke="none" transform="rotate(12 100 100)"/>`),
};

/* tür → gövde, mermi, omuz (gövde düzleminde, merkez 0,0, yukarı +) */
export const ARMY_KIND = {
  burger:   { body: 'burgerMan',   proj: 'pBurger', sh: [.22, -.08] },
  fries:    { body: 'friesMan',    proj: 'pFry',    sh: [.17, -.06] },
  cocktail: { body: 'cocktailMan', proj: 'pCherry', sh: [.19, .1] },
  beer:     { body: 'beerMan',     proj: 'pCap',    sh: [.15, -.02] },
  cup:      { body: 'cupMan',      proj: 'pBean',   sh: [.16, 0] },
  iced:     { body: 'icedMan',     proj: 'pIce',    sh: [.15, -.02] },
};
