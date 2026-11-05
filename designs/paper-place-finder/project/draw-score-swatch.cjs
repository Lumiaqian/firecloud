// I · 暮光色谱 — 多层横向色带，展示天空从蓝到金到紫的渐变层次
const path = require('node:path');
module.exports = async ({ plate, D, outDir }) => {
  const ink = '#514439';
  const P = plate({ id: 'score-swatch', w: 140, h: 70, ppm: 7, paper: 'cream', seed: 'sky-swatch-layers-4' });

  // 天空色带层次（从上到下：深蓝 → 浅蓝 → 金色 → 暖橙 → 粉紫 → 深紫）
  const bands = [
    { y1: 8, y2: 18, color: '#7895a8', pressure: .32, angle: 5 },
    { y1: 16, y2: 26, color: '#a4bcc8', pressure: .28, angle: 3 },
    { y1: 24, y2: 34, color: '#d4c490', pressure: .35, angle: -2 },
    { y1: 32, y2: 42, color: '#dcaa55', pressure: .45, angle: 8 },
    { y1: 40, y2: 50, color: '#cf7959', pressure: .38, angle: -5 },
    { y1: 48, y2: 58, color: '#a87898', pressure: .3, angle: 10 }
  ];

  for (const b of bands) {
    const shape = D.curve([
      [8, b.y1], [35, b.y1 - 1], [70, b.y1 + .5], [105, b.y1 - .5], [132, b.y1],
      [133, b.y2], [100, b.y2 + .5], [65, b.y2 - .5], [30, b.y2 + 1], [7, b.y2]
    ]);
    P.colour([shape], b.color, { pressure: b.pressure, passes: 2, angle: b.angle });
  }

  // 每条色带之间的轻柔分界线
  for (const y of [18, 26, 34, 42, 50]) {
    P.curve(
      [[10, y], [30, y + .3], [55, y - .2], [80, y + .4], [110, y - .3], [130, y]],
      { nib: .12, color: '#877966', profile: 'taper' }
    );
  }

  // 左右标注：手绘文字占位线
  P.curve([[10, 63], [30, 63.5], [50, 63]], { nib: .14, color: '#a09889' });
  P.curve([[90, 63], [110, 63.5], [130, 63]], { nib: .14, color: '#a09889' });

  await P.finish(path.join(outDir, 'score-swatch.png'));
};
