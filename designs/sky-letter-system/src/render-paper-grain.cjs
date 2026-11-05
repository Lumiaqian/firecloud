'use strict';
const path = require('node:path');

// Paper substrate only: the UI supplies the silhouette and shadow, never an ink frame.
module.exports = async function ({ plate, D, outDir }) {
  for (const [name, w, h] of [['note', 100, 85], ['tall', 85, 110], ['wide', 180, 85]]) {
    const P = plate({ id: `paper-grain-${name}`, w, h, ppm: 6,
      paper: { base: '#fffefb', tooth: .65, fibre: .8 }, seed: `sky-letter-grain-${name}-1` });
    // Extend beyond the canvas so the pigment has no visible boundary or corner marks.
    P.colour([D.curve([[-w, -h], [2 * w, -h], [2 * w, 2 * h], [-w, 2 * h]])],
      '#faf9f5', { pressure: .025, passes: 1, angle: 18 });
    await P.finish(path.join(outDir, `paper-grain-${name}.png`));
  }
};
