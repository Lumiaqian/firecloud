# InkActions

墨迹操作展示无底色文字按钮、朱红选择笔迹、真实键盘焦点与收藏操作。

## 来源与原值

- `designs/paper-place-finder/project/SkyPlaces.dc.html`、`SkyPlacesMobile.dc.html`：第 11 行 22px SVG、1.5px 线宽、44px 点击区域，第 20、31–32 行星形与关闭 SVG 路径，直接复制而非重画。
- `components/bundle.css`：按钮 `10px 7px` 内边距，选择笔迹高 `6px`、距底 `3px`、左右 `8px`；焦点虚线文字下划线偏移 `6px`。图标焦点采用 `1px dashed` 圆形轮廓、内偏移 `-4px`。
- `components/art/mark.png` 为原稿选择笔迹，`rule.png` 为原稿分隔线。字体继承 `--font-hand`，字重始终 400。

## 使用与避免

适合轻量文字操作、独立开关及少量互斥选项。`aria-pressed` 表示选择，不表示键盘焦点；点击切换选择后，按 Tab 仍可同时看见另一按钮的焦点。文字按钮不加彩色矩形、不做胶囊；不要把焦点类写死在样例中，也不要只靠颜色区分选择。

## 消费者输入与状态

此处是 HTML/CSS 参考模式，没有框架依赖。消费者提供按钮文案、可访问名称、选择状态及操作处理器；互斥组选项应保证仅一个 `aria-pressed="true"`。

关键状态：默认、按下、选中、未选中、键盘焦点、悬停；样式也覆盖原生 disabled。星标的 `aria-pressed` 与“收藏／取消收藏”名称同步更新。全部操作区域至少 `44 × 44px`；减少动态时没有过渡；强制颜色模式用系统色焦点及可见选择标记。

## 本地预览边界

`preview.html` 是非实时、纯本页内存样例，不是 API 或持久化生产组件。朝霞／晚霞选择、星标、恢复和清除回声均由卡内局部脚本响应，不联网、不写存储；刷新恢复初始值。运行时已预载 `tokens.css` 和 `components/bundle.css`，预览不重复加载，由共享 SkyLetter 初始化函数绑定本地事件。