const path = require('node:path');
const fs = require('node:fs');
// Fixed-seed pen strokes. Remove the paper matte so only marks cross the CSS paper contours.
module.exports = async ({ plate, D, outDir }) => {
  async function asset(name, w, h, draw) {
    const P = plate({ id: name, w, h, ppm: 2, paper: 'cream', seed: 'journal-controls-' + name + '-1' });
    const pen = (points, nib = .75, color = '#81755e') => P.curve(points, { nib, color, profile: 'taper' });
    draw(P, pen);
    const canvas = P.S.toCanvas(), ctx = canvas.getContext('2d');
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < pixels.data.length; i += 4) {
      for (let c = 0; c < 3; c++) pixels.data[i + c] = Math.min(255, pixels.data[i + c] * 255 / [240, 231, 208][c]);
      const alpha = 255 - Math.min(pixels.data[i], pixels.data[i + 1], pixels.data[i + 2]);
      for (let c = 0; c < 3; c++) pixels.data[i + c] = alpha ? (pixels.data[i + c] - 255 + alpha) * 255 / alpha : 0;
      pixels.data[i + 3] = alpha;
    }
    ctx.putImageData(pixels, 0, 0);
    fs.writeFileSync(path.join(outDir, name + '.png'), await canvas.encode('png'));
  }
  await asset('journal-notebook', 520, 500, (P, pen) => {
    pen([[41,16],[42,173],[40,320],[42,482]], .45, '#bc8771');
    for (const y of [46,139,234,330,427]) { P.outline([D.ell(23,y,3.1,3.5)],{nib:.65,color:'#9f937d'}); pen([[18,y+5],[27,y+5]],.35,'#c3b59a'); }
  });
  await asset('journal-ledger', 500, 430, (P, pen) => {
    pen([[465,11],[464,35],[487,33]], .65);
    pen([[22,412],[191,410],[358,413]], .3, '#b5a184');
  });
  await asset('journal-button', 112, 46, (P, pen) => {
    pen([[12,39],[37,38],[72,40],[102,38]], .55, '#897b63');
  });
  await asset('journal-tab', 94, 62, (P, pen) => {
    pen([[14,55],[39,54],[61,56],[81,54]], .45, '#a59579');
  });
  await asset('journal-rule', 580, 8, (P, pen) => {
    pen([[3,4],[100,3.5],[230,4.5],[400,3],[575,4]], .35, '#a3957a');
  });
  await asset('journal-mark', 130, 16, (P, pen) => {
    P.colour([[[8,7],[43,5],[88,7],[123,5],[120,11],[78,10],[40,12],[9,10]]], '#c36548', {pressure:.25,passes:1,angle:5});
    pen([[6,10],[39,8],[78,10],[124,7]], .8, '#b53826');
  });
  await asset('journal-seal', 112, 100, (P, pen) => {
    pen([[6,25],[7,6],[52,5],[104,8],[105,49],[102,94],[59,92],[7,95],[5,48],[6,29]], 1.15, '#b53826');
    pen([[12,22],[13,12],[55,13],[98,12],[96,52],[97,87],[56,86],[13,88],[12,55],[12,29]], .6, '#b53826');
  });
  await asset('journal-clip', 40, 76, (P, pen) => {
    pen([[27,60],[28,21],[24,14],[17,13],[12,19],[11,60],[15,68],[24,70],[32,65],[33,14],[28,6],[15,5],[7,14],[6,52]], 1.9, '#aa8044');
    pen([[14,23],[14,58],[17,63]], .55, '#d5b776');
  });
};
