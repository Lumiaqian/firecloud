// E · 晨昏日轮扇 — 半圆太阳从地平线升起，放射状光线
const path = require('node:path');
module.exports = async ({ plate, D, outDir }) => {
  const ink = '#514439';
  const P = plate({ id: 'score-fan', w: 120, h: 80, ppm: 8, paper: 'cream', seed: 'sky-fan-card-3' });

  // 半圆太阳（下半部分被地平线切掉）
  const sun = D.curve([
    [30, 56], [35, 40], [42, 30], [52, 24], [60, 22],
    [68, 24], [78, 30], [85, 40], [90, 56],
    [80, 58], [70, 57], [60, 58], [50, 57], [40, 58]
  ]);
  P.colour([sun], '#dcaa55', { pressure: .55, passes: 2, angle: 22 });
  P.colour([D.curve([
    [38, 48], [45, 36], [55, 28], [65, 28], [75, 36], [82, 48],
    [75, 50], [65, 49], [55, 50], [45, 49]
  ])], '#c89153', { pressure: .35, passes: 1, angle: -18 });
  P.outline([sun], { nib: .7, color: ink });

  // 放射光线（从太阳中心向上扩散的短线）
  const rays = [
    [[60, 22], [60, 10]],
    [[48, 28], [40, 16]],
    [[72, 28], [80, 16]],
    [[38, 38], [26, 28]],
    [[82, 38], [94, 28]],
    [[54, 24], [50, 12]],
    [[66, 24], [70, 12]],
    [[44, 32], [34, 20]],
    [[76, 32], [86, 20]]
  ];
  for (const [a, b] of rays) {
    P.ink([a, b], { nib: .45, color: '#c4a16a', profile: 'taper' });
  }

  // 地平线
  P.curve([[8, 57], [25, 56], [40, 58], [60, 56], [80, 58], [95, 56], [112, 57]], { nib: .6, color: ink, profile: 'taper' });

  // 地面层
  const ground = D.curve([
    [6, 57], [20, 58], [40, 56], [60, 59], [80, 57], [100, 58], [114, 57],
    [114, 75], [6, 75]
  ]);
  P.colour([ground], '#c1b68d', { pressure: .2, passes: 1, angle: 5 });

  // 云朵（左上方）
  const cloud = D.curve([
    [12, 32], [16, 27], [22, 26], [28, 23], [34, 25], [38, 30], [35, 34], [26, 35], [18, 34], [13, 35]
  ]);
  P.paper([cloud]);
  P.colour([cloud], '#b0c3c8', { pressure: .22, passes: 1, angle: 10 });
  P.outline([cloud], { nib: .5, color: ink });

  // 右上小云
  const cloud2 = D.curve([
    [85, 20], [90, 17], [97, 17], [102, 20], [100, 24], [93, 25], [87, 24]
  ]);
  P.paper([cloud2]);
  P.colour([cloud2], '#b9c8cd', { pressure: .18, passes: 1, angle: -8 });
  P.outline([cloud2], { nib: .4, color: ink });

  // 底部标注线
  P.curve([[15, 68], [35, 69], [55, 68], [80, 69], [105, 68]], { nib: .12, color: '#a7a08b' });

  await P.finish(path.join(outDir, 'score-fan.png'));
};
