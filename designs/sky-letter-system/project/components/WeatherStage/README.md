WeatherStage 是从已批准画笺提取的环境天气与固定纸笺参考，天气过场不改写所选预报事件。

# WeatherStage

## 来源

- `designs/paper-place-finder/project/SkyLetterStudy.dc.html`：11–21、40–51 行，九种天气、四种天色、雨雪雹粒子、云雾、固定月位与纸缘接触。
- `designs/paper-place-finder/project/SkyMotionFlow.dc.html` 与 `SkyMotionFlowMobile.dc.html`：12–18、28–33、43–49 行，650 ms 透明度过场、两张固定纸笺、夹子/圈注/胶带局部反馈。
- `designs/paper-place-finder/project/canvas.json`：`notes.approvedTypography`、`notes.motionCoverage`、`notes.sceneContract`、`notes.forecastCoverage`；以当前方向和不透明纸面为准，不采纳历史备选。

## 使用 / 避免

用于区分「当前环境」与「预报日期」的设计交接、桌面/手机构图和减弱动态讨论。使用不透明 `.sl-paper`，正文固定在天气之上；所有操作区域至少 44 px，朱砂选中与墨色虚线焦点不是同一状态。

不要把天空渐变当作数据读取底色，不让降水穿透纸面，不让夹口或整张纸随风漂移，不让雷暴自动闪烁数据，不把未来预报当成当前天空。不要复制本卡作为生产天气引擎或权限处理器。

## 消费方输入与关键状态

参考输入：`weather` = `clear | partly | overcast | fog | rain | snow | thunder | hail | wind`；`light` = `day | dawn | dusk | night`；动效意愿与系统 `prefers-reduced-motion`。环境展示层只读这些输入。正式应用提供真实天气/昼夜状态；卡片只提供确定性本地样例，无 API、网络、定位、相机、浏览器存储或持久化组件状态。

- 晴空 / 多云：固定日轮；夜色保留固定弯月。月轮仅为源稿固定图示，不声称是真实天体位置。
- 阴 / 雨 / 雷雨 / 冰雹：云幕置于月轮之前；雨雪雹置于纸面之后。
- 雨：两处上缘水滴；雪：源稿折线积雪；冰雹：上缘局部弹跳；风：自由纸角运动，胶带锚点不动。
- 黄铜夹点击：单次 650 ms 局部引雷，不自动反复触发；圈注暖光 3600 ms；胶带阵风 2200 ms。关闭动效后只在状态行给静态反馈。
- 关闭动效 / 系统减弱动态：停止粒子、柔光变化、闪电、月晕、星光和纸角；保留静态月轮、云雾、天气名称和纸缘状态。
- 日期演示：03 / 05 日按钮只更新横笺选中态，主笺 77、17:12 与环境完全不变。完整的预报事件联动由 Forecast 参考负责，本卡明确不是该行为适配器。

## 主题与实现边界

预览初始跟随父级 `<html data-theme>` 的四种主题；手动选择天色后只覆盖本卡，不修改 html 或 body。纸张与墨色继续消费共享主题 tokens。天气渐变消费 `--weather-<preset>-top/mid/bottom`，不声明根级默认 token。粒子、云雾、纸角等源稿插画色保留在 `components/bundle.css`，它们是插画几何用色而非语义 token。

本卡为原生 HTML/CSS/JS 脚本，共享 bundle.js 只导出原生预览初始化函数，不依赖 React。36 个预置天气/天色画层通过 650 ms `opacity` transition 交叠，连续切换可从当前透明度转向；非活动画层停止粒子动画。未模拟源稿的雨风轻/强控制、右划天空手势和完整七日横笺；对应精确时序保留于 `Motion.md`。这些是明确的设计预览限制，不是生产能力声明。
