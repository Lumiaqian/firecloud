'use strict';
// Logo A optical derivative: preserve its sun/cloud silhouette and original palette.
// node ~/.agents/skills/pen-pencil-art/scripts/render.cjs <this-file> <output-dir>
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const skillRequire = createRequire(path.join(require('node:os').homedir(), '.agents/skills/pen-pencil-art/vendor/statechart-art/tools/package.json'));
const { createCanvas } = skillRequire('@napi-rs/canvas');
module.exports = async function ({ plate, D, outDir }) {
  for (const micro of [true, false]) {
    const P = plate({ id: 'browser-mark', w: 80, h: 80, ppm: 6.4, paper: 'cream', seed: micro ? 'sky-letter-favicon-16-a1' : 'sky-letter-favicon-32-a1' });
    const ink = '#44372f', x = 40, y = micro ? 31 : 32, r = micro ? 21 : 19;
    const ring = D.curve([[x-r,y],[x-r*.75,y-r*.72],[x-1,y-r],[x+r*.75,y-r*.7],[x+r,y+1],[x+r*.7,y+r*.72],[x,y+r],[x-r*.73,y+r*.68]]);
    P.colour([ring], '#dcaa55', { pressure: .82, passes: 2, angle: 28 });
    P.colour([D.curve([[x-r,y+1],[x-r*.55,y+3],[x+2,y-1],[x+r,y+2],[x+r*.7,y+r*.72],[x,y+r],[x-r*.73,y+r*.68]])], '#c76d56', { pressure: .62, passes: 1, angle: -25 });
    P.outline([ring], { nib: micro ? 2.5 : 1.6, color: ink });
    if (!micro) {
      for (const ray of [[[17,16],[21,21]],[[40,6],[40.5,11]],[[62,15],[58,20]]]) P.ink(ray, { nib: 1.25, color: ink, profile: 'taper' });
    }
    const cloud = D.curve([[8,51],[14,45],[21,45],[27,38],[35,39],[40,46],[47,44],[54,45],[59,50],[68,51],[73,57],[67,63],[55,63],[46,65],[35,63],[23,64],[17,60],[10,60]]);
    P.paper([cloud]);
    P.colour([cloud], '#b9cbd0', { pressure: .5, passes: 1, angle: 12 });
    P.outline([cloud], { nib: micro ? 2.5 : 1.6, color: ink });
    // No cloud interior strokes, ground underline or fine grain added at icon scale.
    const c = P.S.toCanvas(), g = c.getContext('2d'), u = c.width / 80;
    g.save();g.scale(u,u);g.globalCompositeOperation='destination-in';g.beginPath();
    g.moveTo(15,2);g.quadraticCurveTo(39,0,64,2);g.quadraticCurveTo(77,3,78,16);
    g.quadraticCurveTo(80,40,78,65);g.quadraticCurveTo(77,77,64,78);
    g.quadraticCurveTo(39,80,15,78);g.quadraticCurveTo(2,77,2,64);
    g.quadraticCurveTo(0,40,2,15);g.quadraticCurveTo(3,3,15,2);g.closePath();g.fill();g.restore();
    const stem = micro ? 'favicon-a-micro' : 'favicon-a-detail';
    fs.writeFileSync(path.join(outDir, stem + '.png'), await c.encode('png'));
    for (const size of micro ? [16] : [32,48]) {
      const small = createCanvas(size,size), ctx = small.getContext('2d');
      ctx.imageSmoothingQuality='high';ctx.drawImage(c,0,0,size,size);
      fs.writeFileSync(path.join(outDir, 'favicon-a-' + size + '.png'), await small.encode('png'));
    }
  }
};
