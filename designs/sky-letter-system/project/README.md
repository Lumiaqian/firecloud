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
- 当前设计基线为 A：分组旁批与七日横笺。有效桌面、手机、状态与天气场景使用同一纸笺契约；历史页 `archive`、`weather`（98 历史天气散页）与 `alternatives` 不作为实现依据，也不随当前样式迁移。
- 消费顺序：读取本文和对应组件 README，再加载 `tokens.css`、`components/card-foundation.css` 与消费者自己的布局 / 资产映射。组件预览加载 `components/bundle.css`，由其首行导入 foundation 并映射预览原点素材；保留字体及其许可证。
- 组件为原生 HTML/CSS/JS 模式。`window.SkyLetter.<Name>(document)` 只初始化本地样例，既不是 React 组件，也不提供生产数据适配器。纸笺视觉由 foundation 定义，业务状态、天气运行时和整页定位由消费者负责。
- 源系统位于 `designs/sky-letter-system/project/`；画布安装副本位于 `project/ds/sky-letter/`，生产快照为 `css/sky-letter-cards.css`。两者应从源文件同步，不能另存一套卡片值或在末尾叠加覆盖来宣称一致。
- 本轮文档和代码变更不代表运行验收。组件、画布和生产的具体运行证据由仓库验收记录说明；没有执行的视口、浏览器、真实数据和辅助技术检查，不声称已验证。

### 共享纸笺契约
`components/card-foundation.css` 是纸面、字体、尺寸、内部排版、分项括注与七日笔迹的唯一手写定义；源预览的 `.sl-fc-*` 是同一选择器中的适配入口，不是第二份视觉规则。页面 CSS 只负责纸笺位置、外边距、环境、业务状态与交互反馈。

预览布局和上传素材映射写在 `components/preview-layout.css`。运行仓库 `npm run design:sync` 将它与 foundation 合成为 `components/bundle.css`，再分发安装副本与生产样式；不手改生成的 bundle。这样编辑器内联注入样式时也不会把相对 CSS 导入解析到错误目录。

| 根标记 | 用途与内部部分 |
| --- | --- |
| `data-sl-card="score"` | `score-art`、`score-heading`、`score-label`、`score-value`、`grade`、`advice`、`record-meta`。静态样例中 label/value 直接属于纸笺；真实圈注按钮用 `score-control` 包含 label/value，foundation 对其内部坐标作等价换算，不能把按钮嵌在另一个按钮内。 |
| `data-sl-card="time"` | `event-label`、`event-time`、`event-state`、`azimuth`、`window`、`window-label`、`window-range`、`peak`、`clip`。窗口可有纯布局包装，不改变时间类型与字号。 |
| `data-sl-card="factors"` | `factor-groups`；每组 `factor-group-header` 包含 `factor-group-heading`（或 `factor-group-title`）与说明；`factor-list` / `factor-row` / `factor-name` / `factor-reading` / `factor-value` / `unit` / `delta`；末尾 `factor-margin` / `factor-cap` / `factor-details`；`wind`。 |
| `data-sl-card="forecast"` | `day` 与 `day-date` / `day-score` / `day-grade` / `day-time` / `day-mark`；横滚区域是消费者的外层容器，不裁掉焦点。 |
| `data-sl-card="status"` | 无记录时的纸面、标题 h1/h2 与说明。`loading-caption` / `sl-fc-loading-caption` 保持单独小字样式。 |
| `data-sl-card="sheet"` | 590px 观测纸面和 padding；原生 dialog、滚动区、遮罩、焦点和贴底定位由消费者提供。 |
| `data-sl-card="context"` | 仅复用纸面和手写字体的上下文摘记；不冒充主评分、时间或状态卡片，不继承它们的几何。 |

`score-value` 指完整数字行，数字本身继承字号，不增加第二个放大元素。评分纸仅圈注 / 等级交互；黄铜夹固定在时间纸，风接触固定在天气批注纸。静态参考不添加无行为按钮；装饰夹可用 `span[data-sl-part="clip"][aria-hidden="true"]`。

天气分项的 `data-major="true"` 标在实际主扣分 row，`data-effect="up"` 表示有利项。日期 button 用 `aria-pressed`，导航链接用 `aria-current="page"`；不可操作的静态样本可用 `data-current="true"`，但不能代替真实可访问状态。最高日用 `data-best="true"`，缺测按钮需真实 disabled，且保留原因文字。

宽屏主评分 480px、时间 300px；701–900px 为 440px / 270px；700px 及以下评分占容器、时间 286px 且不超过 94%，评分在前、时间靠右。云层 / 空气 700px 及以下改为上下两组。七日整张横笺桌面最小 900px，手机 915px，仅在外层区域横滚。sheet 在 600px 及以下贴底；这不改变首页 700px 的断点。

### 消费者资产映射
foundation 不内置 URL。以下 `--sl-asset-*` 变量必须为完整 `url(...)`；画布和预览用本项目可解析的上传地址，生产 CSS 以自身位置解析本地文件。不要把编辑器上传地址复制进生产。

| 变量后缀（前缀 `--sl-asset-`） | 原素材文件 |
| --- | --- |
| `paper-mask` | `supporting-paper-mask.svg` |
| `paper-grain` | `paper-grain-wide.png` |
| `time-marks` | `home-time-marks.png` |
| `pencil` / `brace` / `leader` | `supporting-pencil.png` / `supporting-brace.png` / `supporting-leader.png` |
| `focus` / `clip` | `outlook-focus.png` / `clip.png` |

源预览的精确上传 URL 由 `bundle.css` 开头映射。生产 `css/style.css` 的映射以 `../assets/paper/<文件名>` 解析；评分图仍是 DOM `<img src>`，各消费者解析自己的 `score-annotations.png` 路径。`--paper-weather-wash` 是可选的天气背景层，只作用于纸面伪元素，不能替换纸张、裁剪文字或漂移整张纸。

### 预览明确边界
- PaperNote：常规、封顶和必要云层缺失三个冻结样例；没有实时倒计时或算法。缺测保留已知事件时刻，但不伪造窗口 / 峰值。
- FactorGrid：冻结分项、原生 details；可选资料缺失写「— / 缺测」并说明模型默认值，不当作实测。没有实时数据重算。
- ForecastStrip：选择固定七日 / 最高日并更新摘要；不驱动本卡之外的纸笺，最高日是固定样例，不是通用推荐器。
- StatusNote：八种本地状态；刷新 / 重试只进入等待状态，不自动成功，不联网、不读写缓存。有记录时不重建双纸；无记录才使用独立状态纸。
- ObservationSheet：原生 dialog 的打开 / 关闭 / 焦点恢复；横线不是拖拽手柄，无手势、软键盘或权限模拟。
- WeatherStage：九种天气、四种天色的本地插画与时间夹 / 评分圈注 / 天气纸缘反馈；日期按钮只改选中态。没有真实天文位置、雨风强度控制、右划手势或完整七日联动，不替代生产天气引擎。


---

## Consuming this system (generated — do not edit)

Every path named below is under `project/` in this design system: read `project/api/tokens.md`, not `api/tokens.md`.

`components/bundle.js` defines native `window.SkyLetter` preview initializers (10 references), not mountable framework components. `components/bundle.css` imports `components/card-foundation.css`; `tokens.css` provides variables and font loading.

- **Standalone / production:** load tokens and the byte-identical card foundation by URL, assign the documented asset variables for that consumer, and provide native markup and business controllers. Copying CSS without resolving assets is not a completed integration.
- **Design canvas:** install the source system under `project/ds/sky-letter/`, load tokens and `components/card-foundation.css`, map assets to the canvas origin, and use the native `data-sl-card` / `data-sl-part` contract. Do not mount the document initializers through `x-import`.
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
