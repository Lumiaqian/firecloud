// F · 决策手帖 — 翻开的笔记本，左页有手绘天气小品，右页有待办清单符号
const path = require('node:path');
module.exports = async ({ plate, D, outDir }) => {
  const ink = '#514439';
  const P = plate({ id: 'score-decision', w: 130, h: 80, ppm: 7.5, paper: 'cream', seed: 'sky-decision-note-4' });

  // 笔记本轮廓（展开的双页，带圆弧书脊）
  const leftPage = D.curve([
    [10, 12], [63, 10], [64, 68], [10, 70]
  ]);
  const rightPage = D.curve([
    [66, 10], [120, 12], [120, 70], [66, 68]
  ]);
  P.colour([leftPage], '#ebe7d8', { pressure: .12, passes: 1, angle: 30 });
  P.colour([rightPage], '#f0ece0', { pressure: .1, passes: 1, angle: -15 });
  P.outline([leftPage], { nib: .65, color: ink });
  P.outline([rightPage], { nib: .65, color: ink });

  // 书脊中缝
  P.curve([[65, 9], [64.5, 25], [65.5, 45], [65, 68]], { nib: .85, color: ink, profile: 'taper' });

  // 左页：手绘小太阳
  const miniSun = D.curve([
    [28, 28], [30, 22], [34, 19], [40, 18], [44, 20], [46, 26], [44, 32],
    [40, 34], [34, 33], [30, 32]
  ]);
  P.colour([miniSun], '#dcaa55', { pressure: .45, passes: 2, angle: 25 });
  P.outline([miniSun], { nib: .5, color: ink });
  // 太阳光线
  for (const [a, b] of [
    [[34, 18], [33, 13]], [[40, 17], [41, 12]], [[46, 22], [51, 19]],
    [[28, 24], [23, 22]], [[30, 32], [26, 36]], [[44, 33], [48, 37]]
  ]) P.ink([a, b], { nib: .35, color: '#c4a16a', profile: 'taper' });

  // 左页：小云朵
  const miniCloud = D.curve([
    [22, 42], [26, 38], [32, 37], [38, 40], [44, 38], [50, 40],
    [52, 44], [48, 47], [38, 48], [28, 47], [23, 46]
  ]);
  P.paper([miniCloud]);
  P.colour([miniCloud], '#b5c7cc', { pressure: .2, passes: 1, angle: 8 });
  P.outline([miniCloud], { nib: .45, color: ink });

  // 左页底部横线（笔记线）
  P.curve([[16, 55], [28, 56], [42, 55], [56, 56]], { nib: .14, color: '#a09889' });
  P.curve([[16, 60], [30, 61], [44, 60], [56, 61]], { nib: .12, color: '#a09889' });

  // 右页：勾选框样式（手绘方框 + 勾号）
  // 第一行 — 已勾选
  const box1 = D.curve([[72, 20], [78, 19.5], [78.5, 25.5], [72, 26]]);
  P.outline([box1], { nib: .4, color: ink });
  P.ink([[73, 23], [75, 25.5], [78, 19]], { nib: .45, color: '#7a9e5c', profile: 'taper' });
  // 右侧写横线代表文字
  P.curve([[82, 22], [95, 22.5], [108, 22]], { nib: .2, color: '#877966' });

  // 第二行 — 已勾选
  const box2 = D.curve([[72, 32], [78, 31.5], [78.5, 37.5], [72, 38]]);
  P.outline([box2], { nib: .4, color: ink });
  P.ink([[73, 35], [75, 37.5], [78, 31]], { nib: .45, color: '#7a9e5c', profile: 'taper' });
  P.curve([[82, 34], [92, 34.5], [104, 34]], { nib: .2, color: '#877966' });

  // 第三行 — 未勾选
  const box3 = D.curve([[72, 44], [78, 43.5], [78.5, 49.5], [72, 50]]);
  P.outline([box3], { nib: .4, color: ink });
  P.curve([[82, 46], [96, 46.5], [112, 46]], { nib: .2, color: '#877966' });

  // 右页底部：小箭头标记
  P.ink([[78, 58], [82, 55], [86, 58]], { nib: .5, color: '#b53826', profile: 'taper' });
  P.curve([[90, 57], [100, 57.5], [112, 57]], { nib: .16, color: '#a09889' });

  await P.finish(path.join(outDir, 'score-decision.png'));
};
