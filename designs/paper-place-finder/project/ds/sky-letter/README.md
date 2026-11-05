## 天空画笺

天空留给天气，纸笺留给判断。

### 阅读与构图
- 先回答「值得追吗」，再给事件时间、天气批注，最后看未来七日。批注在七日前，不把两者塞回一张大卡片。
- 主分数在左下，事件便笺在右上；手机先读判断，再读靠右的时间笺。已有记录时始终保留这两张纸；城市下用紧凑文字行说明读取状态，不增加第三张状态大纸。纸笺之间留出天空，不铺满等大卡片。
- 用不透明 `paper` 承载文字。手绘感来自开口圈线、旁批引线、分组括注与软纸边，不来自歪矩形或重描边。
- 页头文字是「霞光预报」，设计系统名是「天空画笺」。Logo 使用暂选 A「日轮云笺」，不重新描摹。

### 字体与数值
- 所有中文、数字、英文、单位及表单控件使用 `font-hand`（小赖 400）。不要混用宋体、等宽数字字体或伪粗体。
- 元信息使用 `sl-caption12` / `sl-caption13`，正文用 `sl-body14` / `sl-body16`；12px 是本系统文字下限。
- 主分数随纸笺容器缩放，桌面上限 `sl-score124`、手机上限 `sl-score99`；七日共用 `sl-day42`。时间旁批桌面用 `sl-time58`、手机用 `sl-time54`。数字与单位独立，不把正文放大成展示字。
- 单位与数值分开，增减分独立对齐。缺测写「— / 缺测」，不能写成 0；没有日出日落事件，也不能伪造时间。

### 墨色与状态
- 正文用 `ink`，辅助说明用 `ink-muted`；两者落在 `paper` / `paper-note` 上。
- `ink-accent` 用于动作与错误，`ink-selected` 用于七日当前项；必须同时保留文字、笔迹或语义属性，不能只靠红绿色区别。
- 天空文字统一使用 `sky-ink`，动作和选中笔迹使用 `sky-accent`。浅色天空引用对应 `on-light` 令牌；夜间、雨、雷暴、冰雹引用 `on-dark` 令牌。生产 CSS 只选择令牌，不再另存颜色值；`weather-ink-*` 保留原天气场景稿的文字色，不覆盖首页控件规则。
- 当前地点用地名下划线与「当前」，星标只管理收藏。不得把整行铺成深色矩形选中块。
- 文字按钮的键盘焦点是石墨虚线下划线；图标按钮是虚线轮廓；输入框只加深底线，不增加边框高度。
- 图标及按钮最小目标用 `target-min`（44px）；灰掉的文字不能代替 disabled 属性。

### 纸面与素材
- 使用独立的背景伪元素裁剪纸边，不裁剪内容、焦点、纸夹和溢出的胶带。
- `radius-none` 不代表画一个矩形边框；纸张轮廓取自 PaperNote。`radius-disc` 只给月体、圆形焦点等几何元素。
- 装饰素材见 Logos / Paper 分组。圈线、括注、引线和纸面遮罩直接复用原件；Logo 保持比例。旧印章仅归档，不再作为评分卡的主体。
- 行为图标沿用源稿 22px、1.5px 描边 SVG，必须有可访问名称；不用 emoji 代替图标。
- 评分、时间、天气批注、七日共用 `supporting-paper-mask.svg` 的微弯纸边、`paper-grain-wide.png` 底纹和同一档轻投影；不得给主卡另做规则圆角面板。评分叠加 `score-annotations.png` 的开口圈、等级引线和建议括注，时间叠加 `home-time-marks.png`；数字与文字仍是 DOM。禁止环绕描边、锐角多边形和沿边做旧。
- 天气批注分云层、空气两组，旁批指出实际主要扣分项。七日是一张无折痕的连续横笺：当前划线、最高圈注，不逐日加框。纹理只混合在不透明背景，高对比模式关闭装饰。
- 保存、刷新、更新失败与切换未完成共用城市下的同一状态行：更新时间带日期，状态与动作原位替换，不推移评分笺和时间笺。两笺标清记录日期/时段；过期或未确认记录只给静态事件时刻与窗口，不显示倒计时、进行中判断或冒充当前的旧天气。新鲜度只在状态行说明一次；当前天气未确认则写「天气实况待更新」。仅无记录的首次读取、失败、无事件或必要缺测可使用独立状态纸。

### 天空与运动
- 暮色、白昼、破晓、夜色是环境，不是四套业务主题。夜色保留深墨字与 `paper`，不会反转成白字黑卡。
- 实况天气、此刻月相、所选预报事件是独立状态。点未来七日只改预报，不改月亮与天气。
- 动画只在天空和纸缘发生，数字与正文保持稳定。遵守 Motion 章节的天气、月相、过场和减弱动态规则。
- 天空渐变不是安全的正文底色。浅色地平线、浓雾等对比度边界见 Accessibility。

### 文案
- 短句、明确动作：「选择天空」「收藏地点」「更新未果」「重试」。不在界面解释设计理念。
- 说明数据新旧和影响：「沿用旧记录」不同于「暂无可用预测」。换城不能展示旧城分数。
- 所有组件预览标明「非实时样例」；不得把固定样例当成实际天气或天文历算结果。

### 使用这套系统
- 当前设计基线为 A：分组旁批与七日横笺。有效桌面、手机、状态与天气场景共用这套规则；历史与备选不作为实现依据。生产首页、页面流程、反馈、天气动效与图标已按此基线接入；运行验收与设备限制见仓库 README。
- 消费顺序：读取本文和对应组件 README，再加载 `tokens.css`、`components/bundle.css`；保留 art/ 素材、fonts/ 与 licenses/ 字体许可证。
- 组件使用原生 HTML/CSS/JS，无 React 依赖。预览页由共享 `components/bundle.js` 中的 `window.SkyLetter.<Name>(document)` 初始化，仅控制本地样例状态，不提供生产数据适配器。画布复用令牌与 HTML 模式，不把这些初始化函数当作 React 组件。
- 编辑令牌只影响引用该令牌的组件。既有画板接入 Theme 令牌目录不等于批量迁移全部内联样式；画布中的「设计系统接入」画板演示真正引用。
- 画布安装副本位于 `project/ds/sky-letter/`。系统修改后需显式更新副本；不会跨项目自动同步。不要分别编辑源系统和安装副本。
- 顺序固定：先更新设计系统及相关桌面、手机、状态稿，审阅后再同步生产。代码试做不自动成为设计基线。


---

## Consuming this system (generated — do not edit)

Every path named below is under `project/` in this design system: read `project/api/tokens.md`, not `api/tokens.md`.

`components/bundle.js` defines `window.SkyLetter` (10 components); `components/bundle.css` is its stylesheet; `tokens.css` is every token as a CSS variable plus `@font-face` for the fonts. `components/bundle.css` reads its variables from `tokens.css`. Build any UI by mounting these components; never hand-build a control or draw an icon the system provides.

- **Standalone page:** inline `tokens.css` and `components/bundle.css` in a `<style>`, then `components/bundle.js` as a classic script (a file containing `</style`, `</script` or `<!--` breaks an inline element: write the sequence `<\/style`, `<\/script` or `\x3C!--` in your copy, or load that file by URL).
- **Design canvas:** bring `tokens.css`, `components/bundle.css`, `components/bundle.js` and `components/index.d.ts` (for the editor’s props panel) onto the canvas in full, as the canvas type’s design-system components reference says (a server-side copy first where it offers one); in each artboard that uses this system, right after the `support.js` line, load `tokens.css` first, then the stylesheet, then the script; mount with `<x-import component-from-global-scope="SkyLetter.<Comp>" …>`.
- **Slides deck, or any surface that cannot run the bundle:** tokens and fonts — the values are on `api/tokens.md`; the deck takes `tokens.json` by file path for its colour pickers, and fonts as “Fonts” below says.

Fonts: `tokens.css` loads each font from its file, by path.

- **Design canvas:** copy `fonts/Xiaolai-Regular.woff2` to the same paths under the canvas’s `project/ds/<folder>/` (`<folder>` is the folder you install this system under; `fonts/Xiaolai-Regular.woff2` lands on `project/ds/<folder>/fonts/Xiaolai-Regular.woff2`), in the same call that installs this system; the copy of `tokens.css` that each artboard links loads them from there. If the install’s reply leaves a font out, bring that font in as for any other page.
- **Slides deck:** for each family you use in the deck (`faces` holds at most the number of typefaces Slides’ `deck-files.md` gives), install its file with the system and name the path it lands on as that family’s `src` in `project/deck.json` `faces`, under the key in the Slides column. A deck takes a font as a file only under the rule in Slides’ `fonts.md` (no space or leading underscore in its path, for two): any other font, or one kept by id, is uploaded as `fonts.md` says.
- **Any other page:** one file per family is enough (below: the upright face nearest regular weight; bold and italic synthesize). Fetch it as the fetch column says (read the file: a path is in this system’s directory, an id is its `_blobs/<id>.<ext>`), copy it beside your page or import it as an asset (`artifact.mjs upload`, where your tool lists that) and declare it with an `@font-face { font-family: "<family>"; src: url(<uploaded>) }` rule.

| family | file | fetch | CSS | Slides `faces` key |
| --- | --- | --- | --- | --- |
| Xiaolai | `fonts/Xiaolai-Regular.woff2` (weight 400) | `read` the file with `project/` in front | `var(--font-hand)` | `xiaolai` |

**Read, per thing:** a component’s props, parts and examples: `api/components/<Comp>.md`; token values: `api/tokens.md`; stored assets and their paths: `api/assets/<Group>.md`. After this README, fetch the cards and fonts you need in ONE message as parallel calls — none depends on another.

**Two rules.** Before you use a thing — a component, a token group, an icon, an asset — read its card from the index below; a value you did not read from a card is a guess. `tokens.json`, `manifest.json`, `components/index.d.ts` and `design-system.json` are sources for tools: hand them over. `components/<Comp>/README.md` and `assets/<Group>/README.md` are the long-form second read a card links to; the `design-system` skill is authoring guidance, not needed to consume the system.

## Index (generated — do not edit)

**Tokens**

- `api/tokens.md` — Every token: surface, text, palette, type, spacing, radius, sizing, duration. (17.5k)

**Icons and assets**

- `api/assets/Logos.md` — 6 files, by asset id. (2.1k)
- `api/assets/Paper.md` — 15 files, by asset id. (2.8k)

**Components** (`api/components/<Comp>.md`, 10)

- **墨迹控件**: `InkActions` — 墨迹操作展示无底色文字按钮、朱红选择笔迹、真实键盘焦点与收藏操作。 · `CitySearch` — 城市搜索以原稿的细线输入、手写标签与纸上结果行展示可清空的本地城市筛选。 · `PlaceRow` — 地点行把切换地点与切换收藏分为两个独立原生按钮，用“当前”文字和细下划线表示当前地点。 · `ObservationSheet` — 观测纸笺将批准原稿的桌面不规则纸面与移动贴底抽屉外观应用于原生模态 dialog。
- **预报纸笺**: `PaperNote` — PaperNote 用开口圈注的评分笺与右上方事件便笺，呈现同一次晨昏观测的判断和时间窗口。 · `ForecastStrip` — ForecastStrip 是无折痕的连续七日横笺，用日期按钮、圈注最高日与选中划线呈现预报展望。 · `FactorGrid` — FactorGrid 用云层与空气两组旁批，解释所选预测的数值、增减分及主要影响项。
- **读取与反馈**: `StatusNote` — StatusNote 在城市下用紧凑文字行说明已有记录的新鲜度，保留评分与时间两张纸；仅无记录时使用独立状态纸。
- **天空与月相**: `WeatherStage` — WeatherStage 是从已批准画笺提取的环境天气与固定纸笺参考，天气过场不改写所选预报事件。 · `MoonPhase` — MoonPhase 保留已批准月相札记的七种亮面与可见性状态，月相属于此刻，不随未来预报日期切换。
