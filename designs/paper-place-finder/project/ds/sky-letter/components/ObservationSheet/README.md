观测纸笺将批准原稿的桌面不规则纸面与移动贴底抽屉外观应用于原生模态 dialog。

## 来源与原值

- `SkyPlaces.dc.html` / `SkyPlacesMobile.dc.html`：桌面 590px 观测纸、手机贴底抽屉、手写标题和独立滚动区。
- 纸面改为与首页相同的 `supporting-paper-mask.svg`、`paper-grain-wide.png` 与轻投影，不保留旧 polygon 纸边和独立重投影。
- `components/card-foundation.css` 提供 `[data-sl-card="sheet"]` / `.sl-observation-dialog` 的纸面和 padding；`bundle.css` 只保留原生 dialog、遮罩、贴底定位与滚动语义。600px 及以下抽屉宽度 100%、padding `20px 25px 0`，不是首页卡片的 700px 断点。

## 使用与避免

适合短时、可关闭的观测说明或地点选择面板。保留纸面视觉，但使用 `<dialog>` 与 `showModal()` 提供真实模态语义；不复刻原画布中自定义 section 的焦点管理。不另加 `role="dialog"`、自制焦点陷阱或全局 Escape 拦截。

桌面居中；`600px` 及以下贴底。高度以真实 `100dvh` 限制，标题与关闭按钮在滚动区外，长内容在纸笺内滚动。浏览器的软键盘与定位权限不属于此模式；不绘制假键盘、不请求定位。移动横线仅为视觉标记、`aria-hidden="true"`，不是拖拽手柄，本卡没有手势关闭或回弹行为。

## 消费者输入与状态

这是原生 HTML/CSS 参考模式，没有 JS 组件包或生产适配器。消费者提供 dialog id、标题与说明 id、打开按钮、内容、关闭动作，以及本地控件的标签、值与状态。`aria-labelledby`／`aria-describedby` 关联标题和简短说明；关闭按钮有明确名称并用 autofocus 接收初始焦点。

关键状态：关闭、`showModal()` 打开、键盘焦点、关闭恢复。按钮／图标点击区至少 `44 × 44px`。Tab 与 Shift+Tab 由原生 dialog 管理，Escape 使用浏览器默认 cancel／close 行为；点击关闭或“收起纸笺”调用 `close()`，close 事件将焦点恢复打开按钮。遮罩点击不关闭，避免默默丢弃操作；这不是额外的生产确认流程。

减少动态与默认状态均无入场动画，强制颜色模式将纸面改为 Canvas、文字改为 CanvasText，并保留系统焦点轮廓。独立滚动区可用键盘聚焦及滚动。

## 本地预览边界

`preview.html` 使用静态观测说明演示容器，不是 API 或持久化生产组件。代码绑定原生 dialog 打开 / 关闭 / 焦点恢复；没有业务保存、网络、设备定位、拖拽手势或浏览器键盘模拟。本轮未执行浏览器或真实软键盘验收，不能据此宣称所有平台焦点 / 视口行为已验证。运行时预载 token 与共享 CSS，由共享 SkyLetter 预览初始化函数绑定本地事件。
