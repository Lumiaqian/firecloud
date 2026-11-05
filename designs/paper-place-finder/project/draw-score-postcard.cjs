// H · 暮天明信片 — 有齿孔边框和右上手绘邮票图案
const path = require('node:path');
module.exports = async ({ plate, D, outDir }) => {
  const ink = '#514439';
  const P = plate({ id: 'score-postcard', w: 120, h: 80, ppm: 8, paper: 'cream', seed: 'sky-postcard-dusk-6' });

  // 明信片主体轮廓（略不规则的矩形）
  const card = D.curve([
    [10, 8], [110, 7.5], [110.5, 72], [10, 72.5]
  ]);
  P.outline([card], { nib: .65, color: ink });

  // 邮票边框（右上角，齿孔用连续小点暗示）
  const stamp = [];
  // 上边
  for (let x = 82; x <= 104; x += 3) stamp.push([x, 14 + (x % 6 === 0 ? .8 : 0)]);
  // 右边
  for (let y = 17; y <= 38; y += 3) stamp.push([104 + (y % 6 === 0 ? .8 : 0), y]);
  // 下边
  for (let x = 101; x >= 82; x -= 3) stamp.push([x, 38 + (x % 6 === 0 ? .8 : 0)]);
  // 左边
  for (let y = 35; y >= 17; y -= 3) stamp.push([82 - (y % 6 === 0 ? .8 : 0), y]);
  P.outline([stamp], { nib: .45, color: ink });

  // 邮票内部：手绘小日轮
  const miniSun = D.ell(93, 24, 5, 5);
  P.colour([miniSun], '#cf7959', { pressure: .5, passes: 2, angle: 20 });
  P.outline([miniSun], { nib: .4, color: ink });
  // 邮票日轮的光线
  for (const [a, b] of [
    [[93, 19], [93, 16]], [[88, 21], [85, 19]], [[98, 21], [101, 19]],
    [[88, 27], [85, 29]], [[98, 27], [101, 29]]
  ]) P.ink([a, b], { nib: .3, color: '#c4a16a', profile: 'taper' });

  // 邮票底部的小云
  const stampCloud = D.curve([
    [85, 32], [88, 30], [93, 29], [98, 31], [101, 33],
    [99, 35], [93, 36], [87, 35]
  ]);
  P.paper([stampCloud]);
  P.colour([stampCloud], '#a8bec4', { pressure: .2, passes: 1, angle: 5 });
  P.outline([stampCloud], { nib: .35, color: ink });

  // 主体左侧：风景速写
  // 远山
  const ridge = D.curve([
    [16, 45], [24, 35], [32, 30], [42, 34], [52, 38],
    [60, 42], [68, 45], [68, 52], [16, 52]
  ]);
  P.colour([ridge], '#a6b6ae', { pressure: .32, passes: 1, angle: 14 });
  P.outline([ridge], { nib: .5, color: ink });

  // 前景丘
  const hill = D.curve([
    [16, 50], [28, 46], [40, 48], [55, 43], [68, 47],
    [68, 56], [16, 56]
  ]);
  P.colour([hill], '#c1b68d', { pressure: .24, passes: 1, angle: -8 });
  P.outline([hill], { nib: .45, color: ink });

  // 天空中的太阳（主体左上）
  const mainSun = D.ell(35, 20, 6, 6);
  P.colour([mainSun], '#dcaa55', { pressure: .4, passes: 2, angle: 28 });
  P.outline([mainSun], { nib: .45, color: ink });

  // 天空光线
  for (const [a, b] of [
    [[35, 14], [35, 10]], [[29, 17], [25, 14]], [[41, 17], [45, 14]],
    [[29, 23], [25, 26]], [[41, 23], [45, 26]]
  ]) P.ink([a, b], { nib: .3, color: '#c4a16a', profile: 'taper' });

  // 地址线（右下方，明信片风格的手写横线）
  P.curve([[76, 48], [90, 48.5], [105, 48]], { nib: .18, color: '#877966' });
  P.curve([[76, 54], [92, 54.5], [105, 54]], { nib: .16, color: '#877966' });
  P.curve([[76, 60], [88, 60.5], [105, 60]], { nib: .16, color: '#877966' });

  // 中间分割竖线
  P.curve([[74, 42], [74.5, 52], [74, 65]], { nib: .3, color: ink, profile: 'taper' });

  // 底部标注线
  P.curve([[18, 64], [35, 64.5], [55, 64], [68, 64.5]], { nib: .12, color: '#a7a08b' });

  await P.finish(path.join(outDir, 'score-postcard.png'));
};
