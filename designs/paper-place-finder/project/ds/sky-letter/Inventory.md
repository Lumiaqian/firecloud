# 来源与覆盖

## 已认可来源

源目录：`designs/paper-place-finder/project/`。

| 来源 | 提炼内容 |
| --- | --- |
| SkyLetterStudy / SkyLetterMobile / home-card-composition.css | 已采用 A：评分圈注、时间旁批、云层与空气分组、无折痕七日横笺、昼夜配色 |
| SkyPlaces / SkyPlacesMobile | 输入焦点、地点与星标、抽屉、空态与反馈 |
| SkyForecastEdges / SkyForecastEdgesMobile | 封顶、不可研判与无事件的呈现 |
| SkyFeedback / SkyLoading / SkyMissing / SkyStale / SkyRefreshing 等 | 失败、缺测、加载、旧记录与刷新 |
| SkyMoonMobile | 盈亏月相、地平线、此刻与未来预报分离 |
| SkyMotionFlow / 天气场景组 | 九种天气、四种光照、纸缘互动与减弱动态 |
| LogoStudies A / 已上传原始 PNG | 日轮云笺 Logo，不采用其他候选 |

## 系统清单

- 74 个颜色令牌涵盖纸墨、四种环境、天气与月面，含统一生产天空文字及动作的四个明暗底色令牌；不包含旧七日折痕配色，当前横笺只有连续纸纹。
- 13 个文字样式；时间旁批 58px / 54px，七日共用 42px，主分数按容器缩放。保留完整小赖 WOFF2（约 11.3 MiB）与原许可证作为设计源字体。生产按字符分片加载，所有字片的字符集并集须与源字体一致；不得删去生僻地名、外文或单位字符来缩小首屏。
- 9 个间距、2 个几何半径、1 个触控尺寸、6 个时间令牌。源稿的组件特定尺寸保留在各 CSS 中，不强行对齐网格。
- 原始 Logo、纸夹、横线和纸纹；新增评分圈注、时间批注、软纸遮罩、侧括号、铅笔线、引线与最高日圈注。旧印章仅留在资产归档，不再用于当前评分构图。
- 10 组组件：InkActions、CitySearch、PlaceRow、ObservationSheet、PaperNote、ForecastStrip、FactorGrid、StatusNote、WeatherStage、MoonPhase。

## 范围边界

设计系统提炼十组可操作参考，不把整套业务画板复制成组件。完整桌面、手机、异常、流程、天气和动效稿保留在原画布；历史与备选分区隔离。生产使用独立原生控制器接入真实数据，共用本系统令牌和原始素材，不调用组件预览的样例数据。

源稿没有统一令牌命名，本次新增的是语义名称，不是另选配色。细微几何、纸面裁剪路径、透明插画纹理仍是组件材质，不能用一个 radius 令牌代替。当前生产设计文档保留为实现现状记录，不将其旧字体规则重新带进本系统。
