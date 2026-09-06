const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const OUTPUT_DIR = path.join(__dirname, '../public/videos');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const TEMP_DIR = '/tmp/mg_promo_gen';
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// 1. Shared SVG Assets & Gradients
const SVG_DEFS = `
  <defs>
    <!-- Deep Emerald Green Marble Gradients -->
    <radialGradient id="bgGlow" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#0a4635"/>
      <stop offset="45%" stop-color="#04271d"/>
      <stop offset="85%" stop-color="#02140f"/>
      <stop offset="100%" stop-color="#010a07"/>
    </radialGradient>

    <linearGradient id="marbleVein1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#126e54" stop-opacity="0.15"/>
      <stop offset="30%" stop-color="#2cd4a3" stop-opacity="0.3"/>
      <stop offset="50%" stop-color="#08382b" stop-opacity="0.1"/>
      <stop offset="70%" stop-color="#d4af37" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#051f17" stop-opacity="0.05"/>
    </linearGradient>

    <!-- Metallic 24K Gold Gradients -->
    <linearGradient id="goldRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff8d6"/>
      <stop offset="20%" stop-color="#d4af37"/>
      <stop offset="40%" stop-color="#997322"/>
      <stop offset="60%" stop-color="#ffd700"/>
      <stop offset="80%" stop-color="#b8860b"/>
      <stop offset="100%" stop-color="#755214"/>
    </linearGradient>

    <linearGradient id="goldLetterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="25%" stop-color="#fef08a"/>
      <stop offset="50%" stop-color="#d4af37"/>
      <stop offset="75%" stop-color="#ca8a04"/>
      <stop offset="100%" stop-color="#78350f"/>
    </linearGradient>

    <linearGradient id="goldArrowGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#b8860b"/>
      <stop offset="30%" stop-color="#ffd700"/>
      <stop offset="70%" stop-color="#fff5c0"/>
      <stop offset="100%" stop-color="#d4af37"/>
    </linearGradient>

    <linearGradient id="billGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#d1fae5"/>
      <stop offset="30%" stop-color="#a7f3d0"/>
      <stop offset="70%" stop-color="#065f46"/>
      <stop offset="100%" stop-color="#064e3b"/>
    </linearGradient>

    <linearGradient id="billGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fffbeb"/>
      <stop offset="40%" stop-color="#fef08a"/>
      <stop offset="70%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#78350f"/>
    </linearGradient>

    <!-- Drop Shadows -->
    <filter id="goldShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="3" dy="6" stdDeviation="6" flood-color="#000000" flood-opacity="0.85"/>
    </filter>

    <filter id="subtleGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>

    <!-- Diamond Sparkle Star Symbol -->
    <g id="sparkleStar">
      <path d="M 0,-24 Q 2,-4 24,0 Q 2,4 0,24 Q -2,4 -24,0 Q -2,-4 0,-24 Z" fill="url(#goldRingGrad)" filter="url(#subtleGlow)"/>
      <circle cx="0" cy="0" r="3" fill="#ffffff"/>
    </g>
  </defs>
`;

// Marble background SVG snippet
const MARBLE_BG = `
  <rect width="1280" height="720" fill="url(#bgGlow)"/>
  <!-- Marble veins -->
  <path d="M -50,120 Q 300,50 600,220 T 1320,180" fill="none" stroke="url(#marbleVein1)" stroke-width="6" opacity="0.6"/>
  <path d="M 100,680 Q 450,450 780,560 T 1350,490" fill="none" stroke="url(#marbleVein1)" stroke-width="4" opacity="0.5"/>
  <path d="M -20,400 Q 250,320 520,380 T 1000,310" fill="none" stroke="url(#marbleVein1)" stroke-width="2" opacity="0.35"/>
  <!-- Floating gold dust particles -->
  <circle cx="180" cy="140" r="2.5" fill="#ffd700" opacity="0.5"/>
  <circle cx="340" cy="280" r="1.5" fill="#fff" opacity="0.6"/>
  <circle cx="980" cy="160" r="3" fill="#ffd700" opacity="0.4"/>
  <circle cx="1080" cy="420" r="2" fill="#fff" opacity="0.7"/>
  <circle cx="240" cy="580" r="2" fill="#ffd700" opacity="0.4"/>
  <circle cx="820" cy="620" r="2.5" fill="#fde047" opacity="0.5"/>
`;

// Diamond sparkle stars in corners
const CORNER_SPARKLES = `
  <use href="#sparkleStar" x="1170" y="610" transform="scale(0.85)"/>
  <use href="#sparkleStar" x="140" y="110" transform="scale(0.55)" opacity="0.75"/>
  <use href="#sparkleStar" x="1140" y="130" transform="scale(0.65)" opacity="0.8"/>
  <use href="#sparkleStar" x="120" y="630" transform="scale(0.5)" opacity="0.6"/>
`;

// Banknotes fan (3 Green Dollars + 2 Gold Bullion)
const BANKNOTES_FAN = (cx = 0, cy = 0, scale = 1) => `
  <g transform="translate(${cx}, ${cy}) scale(${scale})" filter="url(#goldShadow)">
    <!-- 1st Green $100 Bill (far left -28 deg) -->
    <g transform="translate(-110, -50) rotate(-28)">
      <rect x="-40" y="-85" width="80" height="150" rx="6" fill="#064e3b" stroke="#34d399" stroke-width="2"/>
      <rect x="-35" y="-80" width="70" height="140" rx="4" fill="url(#billGreenGrad)" stroke="#10b981" stroke-width="1"/>
      <circle cx="0" cy="-10" r="22" fill="#042f2e" stroke="#6ee7b7" stroke-width="1.5"/>
      <text x="0" y="-2" font-family="DejaVu Serif, Liberation Serif, serif" font-weight="bold" font-size="22" fill="#a7f3d0" text-anchor="middle">$</text>
      <text x="-25" y="-62" font-family="sans-serif" font-weight="bold" font-size="11" fill="#ecfdf5">100</text>
      <text x="25" y="48" font-family="sans-serif" font-weight="bold" font-size="11" fill="#ecfdf5" text-anchor="end">100</text>
    </g>

    <!-- 2nd Green $100 Bill (-16 deg) -->
    <g transform="translate(-75, -60) rotate(-16)">
      <rect x="-40" y="-85" width="80" height="150" rx="6" fill="#064e3b" stroke="#34d399" stroke-width="2"/>
      <rect x="-35" y="-80" width="70" height="140" rx="4" fill="url(#billGreenGrad)" stroke="#10b981" stroke-width="1"/>
      <circle cx="0" cy="-10" r="22" fill="#042f2e" stroke="#6ee7b7" stroke-width="1.5"/>
      <text x="0" y="-2" font-family="DejaVu Serif, Liberation Serif, serif" font-weight="bold" font-size="22" fill="#a7f3d0" text-anchor="middle">$</text>
      <text x="-25" y="-62" font-family="sans-serif" font-weight="bold" font-size="11" fill="#ecfdf5">100</text>
    </g>

    <!-- 3rd Green $100 Bill (-4 deg) -->
    <g transform="translate(-35, -70) rotate(-4)">
      <rect x="-40" y="-85" width="80" height="150" rx="6" fill="#064e3b" stroke="#34d399" stroke-width="2"/>
      <rect x="-35" y="-80" width="70" height="140" rx="4" fill="url(#billGreenGrad)" stroke="#10b981" stroke-width="1"/>
      <circle cx="0" cy="-10" r="22" fill="#042f2e" stroke="#6ee7b7" stroke-width="1.5"/>
      <text x="0" y="-2" font-family="DejaVu Serif, Liberation Serif, serif" font-weight="bold" font-size="22" fill="#a7f3d0" text-anchor="middle">$</text>
      <text x="-25" y="-62" font-family="sans-serif" font-weight="bold" font-size="11" fill="#ecfdf5">100</text>
    </g>

    <!-- 4th Gold Bullion $ Bill (+8 deg) -->
    <g transform="translate(10, -65) rotate(8)">
      <rect x="-40" y="-85" width="80" height="150" rx="6" fill="#78350f" stroke="#fde047" stroke-width="2"/>
      <rect x="-35" y="-80" width="70" height="140" rx="4" fill="url(#billGoldGrad)" stroke="#d97706" stroke-width="1"/>
      <circle cx="0" cy="-10" r="22" fill="#78350f" stroke="#fde047" stroke-width="2"/>
      <text x="0" y="0" font-family="DejaVu Serif, Liberation Serif, serif" font-weight="bold" font-size="26" fill="#fef08a" text-anchor="middle">$</text>
      <text x="-25" y="-62" font-family="sans-serif" font-weight="bold" font-size="11" fill="#fef9c3">24K</text>
    </g>

    <!-- 5th Gold Bullion $ Bill (+20 deg) -->
    <g transform="translate(50, -50) rotate(20)">
      <rect x="-40" y="-85" width="80" height="150" rx="6" fill="#78350f" stroke="#fde047" stroke-width="2"/>
      <rect x="-35" y="-80" width="70" height="140" rx="4" fill="url(#billGoldGrad)" stroke="#d97706" stroke-width="1"/>
      <circle cx="0" cy="-10" r="22" fill="#78350f" stroke="#fde047" stroke-width="2"/>
      <text x="0" y="0" font-family="DejaVu Serif, Liberation Serif, serif" font-weight="bold" font-size="26" fill="#fef08a" text-anchor="middle">$</text>
      <text x="-25" y="-62" font-family="sans-serif" font-weight="bold" font-size="11" fill="#fef9c3">GOLD</text>
    </g>
  </g>
`;

// Piercing 3D Gold Arrow
const GOLD_ARROW = (cx = 0, cy = 0, scale = 1) => `
  <g transform="translate(${cx}, ${cy}) scale(${scale})" filter="url(#goldShadow)">
    <!-- Dynamic curved arrow shaft -->
    <path d="M -130,50 Q -30,0 120,-80 L 150,-100" fill="none" stroke="url(#goldArrowGrad)" stroke-width="26" stroke-linecap="round"/>
    <path d="M -130,50 Q -30,0 120,-80 L 150,-100" fill="none" stroke="#fff8d6" stroke-width="8" stroke-linecap="round" opacity="0.8"/>
    
    <!-- 3D Beveled Arrow Head -->
    <polygon points="110,-140 180,-120 150,-50 135,-85 85,-75" fill="url(#goldRingGrad)"/>
    <polygon points="110,-140 180,-120 135,-85" fill="#fff8d6" opacity="0.9"/>
    <circle cx="180" cy="-120" r="4" fill="#ffffff" filter="url(#subtleGlow)"/>
  </g>
`;

// 3D Gold Monogram "MG" and Checkmark
const MG_MONOGRAM = (cx = 0, cy = 0, scale = 1) => `
  <g transform="translate(${cx}, ${cy}) scale(${scale})" filter="url(#goldShadow)">
    <!-- 3D Golden Checkmark (Left) -->
    <path d="M -110,-10 L -65,45 L -20,-30 L -5,-15 L -60,75 L -125,5 Z" fill="url(#goldRingGrad)"/>
    <path d="M -105,-5 L -65,40 L -25,-25" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity="0.75"/>

    <!-- 3D Gold Letter M (Center) -->
    <text x="-15" y="55" font-family="DejaVu Serif, Liberation Serif, serif" font-weight="900" font-size="115" fill="url(#goldLetterGrad)" letter-spacing="2">M</text>
    <text x="-13" y="53" font-family="DejaVu Serif, Liberation Serif, serif" font-weight="900" font-size="115" fill="none" stroke="#fff9db" stroke-width="2" letter-spacing="2" opacity="0.6">M</text>

    <!-- 3D Gold Letter G (Right) -->
    <text x="80" y="55" font-family="DejaVu Serif, Liberation Serif, serif" font-weight="900" font-size="115" fill="url(#goldLetterGrad)" letter-spacing="2">G</text>
    <text x="82" y="53" font-family="DejaVu Serif, Liberation Serif, serif" font-weight="900" font-size="115" fill="none" stroke="#fff9db" stroke-width="2" letter-spacing="2" opacity="0.6">G</text>
  </g>
`;

// Complete Circular Golden Medallion
const MEDALLION_FULL = (cx = 640, cy = 360, radius = 240) => `
  <g transform="translate(${cx}, ${cy})">
    <!-- Outer Medallion Shadow -->
    <circle cx="0" cy="0" r="${radius + 15}" fill="#000000" opacity="0.5" filter="url(#goldShadow)"/>

    <!-- Thick Outer Gold Beveled Ring -->
    <circle cx="0" cy="0" r="${radius + 8}" fill="none" stroke="url(#goldRingGrad)" stroke-width="22"/>
    <circle cx="0" cy="0" r="${radius + 18}" fill="none" stroke="#755214" stroke-width="3"/>
    <circle cx="0" cy="0" r="${radius - 2}" fill="none" stroke="#ffe580" stroke-width="3"/>

    <!-- Inner Emerald Green Marble Core -->
    <circle cx="0" cy="0" r="${radius - 4}" fill="#03271d"/>
    <circle cx="0" cy="0" r="${radius - 4}" fill="url(#bgGlow)" opacity="0.9"/>
    <circle cx="0" cy="0" r="${radius - 38}" fill="none" stroke="url(#goldRingGrad)" stroke-width="3" opacity="0.85"/>

    <!-- Top Arched Text: MOHAMED - M GAMEEL MARIE -->
    <path id="topArcPath" d="M -${radius - 22},0 A ${radius - 22} ${radius - 22} 0 0 1 ${radius - 22},0" fill="none"/>
    <text font-family="DejaVu Serif, Liberation Serif, serif" font-weight="bold" font-size="22" fill="url(#goldLetterGrad)" letter-spacing="3.5">
      <textPath href="#topArcPath" startOffset="50%" text-anchor="middle">
        MOHAMED - M GAMEEL MARIE
      </textPath>
    </text>

    <!-- Bottom Arched Text: FOR ACCOUNTING AND AUDITING -->
    <path id="bottomArcPath" d="M ${radius - 22},0 A ${radius - 22} ${radius - 22} 0 0 1 -${radius - 22},0" fill="none"/>
    <text font-family="DejaVu Serif, Liberation Serif, serif" font-weight="bold" font-size="16" fill="url(#goldLetterGrad)" letter-spacing="3">
      <textPath href="#bottomArcPath" startOffset="50%" text-anchor="middle">
        FOR ACCOUNTING AND AUDITING
      </textPath>
    </text>

    <!-- Center Core: Cash Fan + 3D Monogram + Piercing Arrow -->
    ${BANKNOTES_FAN(0, 0, 1.05)}
    ${GOLD_ARROW(0, 0, 1.1)}
    ${MG_MONOGRAM(0, 15, 0.95)}
  </g>
`;

// Scene 1: Grand Opening (Centered Medallion on Emerald Marble)
const generateScene1Svg = () => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  ${SVG_DEFS}
  ${MARBLE_BG}
  ${MEDALLION_FULL(640, 360, 240)}
  ${CORNER_SPARKLES}
</svg>
`;

// Scene 2: Macro Dramatic Zoom-In (Focus on Gold Arrow, Checkmark & $ Bills)
const generateScene2Svg = () => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  ${SVG_DEFS}
  ${MARBLE_BG}
  <!-- Scaled up center (1.8x) centered on arrow and monogram -->
  <g transform="translate(640, 360) scale(1.85) translate(-10, -10)">
    ${BANKNOTES_FAN(0, 0, 1.05)}
    ${GOLD_ARROW(0, 0, 1.1)}
    ${MG_MONOGRAM(0, 15, 0.95)}
  </g>
  ${CORNER_SPARKLES}
</svg>
`;

// Scene 3: Formal Corporate Credential Card & Mirrored Floor Reflection
const generateScene3Svg = () => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  ${SVG_DEFS}
  ${MARBLE_BG}

  <!-- Upper Core Emblem (Miniaturized 0.6x) -->
  <g transform="translate(640, 190) scale(0.68)">
    ${BANKNOTES_FAN(0, 0, 1.0)}
    ${GOLD_ARROW(0, 0, 1.05)}
    ${MG_MONOGRAM(0, 15, 0.92)}
  </g>

  <!-- Golden Title: MOHAMED - M GAMEEL MARIE -->
  <text x="640" y="325" font-family="DejaVu Serif, Liberation Serif, serif" font-weight="900" font-size="44" fill="url(#goldLetterGrad)" text-anchor="middle" letter-spacing="4" filter="url(#goldShadow)">
    MOHAMED - M GAMEEL MARIE
  </text>
  <!-- Subtitle: FOR ACCOUNTING AND AUDITING -->
  <text x="640" y="375" font-family="DejaVu Serif, Liberation Serif, serif" font-weight="bold" font-size="22" fill="url(#goldRingGrad)" text-anchor="middle" letter-spacing="6" opacity="0.95">
    FOR ACCOUNTING AND AUDITING
  </text>

  <!-- Horizontal Glossy Divider Line -->
  <line x1="380" y1="410" x2="900" y2="410" stroke="url(#goldRingGrad)" stroke-width="2" opacity="0.8"/>
  <circle cx="640" cy="410" r="4" fill="#ffd700"/>

  <!-- Lower Mirrored Floor Reflection (Flipped vertically with soft fading opacity) -->
  <g transform="translate(0, 840) scale(1, -1)" opacity="0.28" filter="url(#goldShadow)">
    <text x="640" y="325" font-family="DejaVu Serif, Liberation Serif, serif" font-weight="900" font-size="44" fill="url(#goldLetterGrad)" text-anchor="middle" letter-spacing="4">
      MOHAMED - M GAMEEL MARIE
    </text>
    <text x="640" y="375" font-family="DejaVu Serif, Liberation Serif, serif" font-weight="bold" font-size="22" fill="url(#goldRingGrad)" text-anchor="middle" letter-spacing="6">
      FOR ACCOUNTING AND AUDITING
    </text>
  </g>

  <!-- Sparkling Stars around the Credentials -->
  <use href="#sparkleStar" x="290" y="315" transform="scale(0.7)"/>
  <use href="#sparkleStar" x="990" y="315" transform="scale(0.7)"/>
  ${CORNER_SPARKLES}
</svg>
`;

// Scene 4: Outro Grand Medallion with Extra Sparkle
const generateScene4Svg = () => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  ${SVG_DEFS}
  ${MARBLE_BG}
  ${MEDALLION_FULL(640, 360, 240)}
  <use href="#sparkleStar" x="840" y="210" transform="scale(0.95)"/>
  <use href="#sparkleStar" x="480" y="470" transform="scale(0.75)"/>
  ${CORNER_SPARKLES}
</svg>
`;

console.log('Writing SVG scenes to /tmp...');
fs.writeFileSync(`${TEMP_DIR}/scene1.svg`, generateScene1Svg());
fs.writeFileSync(`${TEMP_DIR}/scene2.svg`, generateScene2Svg());
fs.writeFileSync(`${TEMP_DIR}/scene3.svg`, generateScene3Svg());
fs.writeFileSync(`${TEMP_DIR}/scene4.svg`, generateScene4Svg());

console.log('Converting SVGs to 1280x720 HD PNGs...');
execSync(`ffmpeg -y -i ${TEMP_DIR}/scene1.svg -vf "scale=1280:720" ${TEMP_DIR}/scene1.png`);
execSync(`ffmpeg -y -i ${TEMP_DIR}/scene2.svg -vf "scale=1280:720" ${TEMP_DIR}/scene2.png`);
execSync(`ffmpeg -y -i ${TEMP_DIR}/scene3.svg -vf "scale=1280:720" ${TEMP_DIR}/scene3.png`);
execSync(`ffmpeg -y -i ${TEMP_DIR}/scene4.svg -vf "scale=1280:720" ${TEMP_DIR}/scene4.png`);

console.log('Encoding MP4 scene clips...');

// Scene 1: 0s - 2.5s
execSync(`ffmpeg -y -loop 1 -t 2.5 -i ${TEMP_DIR}/scene1.png -c:v libx264 -tune stillimage -pix_fmt yuv420p ${TEMP_DIR}/clip1.mp4`);

// Scene 2: 2.5s - 5.5s
execSync(`ffmpeg -y -loop 1 -t 3.0 -i ${TEMP_DIR}/scene2.png -c:v libx264 -tune stillimage -pix_fmt yuv420p ${TEMP_DIR}/clip2.mp4`);

// Scene 3: 5.5s - 7.5s
execSync(`ffmpeg -y -loop 1 -t 2.0 -i ${TEMP_DIR}/scene3.png -c:v libx264 -tune stillimage -pix_fmt yuv420p ${TEMP_DIR}/clip3.mp4`);

// Scene 4: 7.5s - 9.0s
execSync(`ffmpeg -y -loop 1 -t 1.5 -i ${TEMP_DIR}/scene4.png -c:v libx264 -tune stillimage -pix_fmt yuv420p ${TEMP_DIR}/clip4.mp4`);

console.log('Concatenating video segments...');
const concatList = `file '${TEMP_DIR}/clip1.mp4'\nfile '${TEMP_DIR}/clip2.mp4'\nfile '${TEMP_DIR}/clip3.mp4'\nfile '${TEMP_DIR}/clip4.mp4'`;
fs.writeFileSync(`${TEMP_DIR}/concat.txt`, concatList);
execSync(`ffmpeg -y -f concat -safe 0 -i ${TEMP_DIR}/concat.txt -c copy ${TEMP_DIR}/video_only.mp4`);

console.log('Synthesizing luxury harmonic orchestral audio chimes...');
const audioFilter = `
  sine=f=130.81:d=9.0[c3];
  sine=f=196.00:d=9.0[g3];
  sine=f=261.63:d=9.0[c4];
  sine=f=329.63:d=9.0[e4];
  sine=f=392.00:d=9.0[g4];
  sine=f=523.25:d=9.0[c5];
  sine=f=659.25:d=9.0[e5];
  [c3]volume=0.45[c3v];
  [g3]volume=0.40[g3v];
  [c4]volume=0.35[c4v];
  [e4]volume=0.30[e4v];
  [g4]volume=0.25[g4v];
  [c5]volume=0.20[c5v];
  [e5]volume=0.15[e5v];
  [c3v][g3v][c4v][e4v][g4v][c5v][e5v]amix=inputs=7:duration=first:dropout_transition=2,afade=t=in:ss=0:d=0.8,afade=t=out:st=7.8:d=1.2[outa]
`;
execSync(`ffmpeg -y -f lavfi -i "${audioFilter.replace(/\\n/g, ' ').trim()}" -map "[outa]" -c:a aac -b:a 192k ${TEMP_DIR}/audio.m4a`);

console.log('Muxing final video and audio into /public/videos/mg_office_promo.mp4...');
const FINAL_MP4 = path.join(OUTPUT_DIR, 'mg_office_promo.mp4');
execSync(`ffmpeg -y -i ${TEMP_DIR}/video_only.mp4 -i ${TEMP_DIR}/audio.m4a -c:v copy -c:a copy -movflags +faststart ${FINAL_MP4}`);

const stats = fs.statSync(FINAL_MP4);
console.log(`SUCCESS! Promo video created at ${FINAL_MP4} (${Math.round(stats.size / 1024)} KB)`);
