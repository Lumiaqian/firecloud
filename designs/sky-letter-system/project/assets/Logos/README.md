# 日轮云笺

logo-a.png 是用户暂选 A 的原始 PNG，源画板 LogoStudies.dc.html 与当前 SkyLetterStudy 均使用同一上传资产。不可近似重绘、换色或改成其他候选。页头保持比例，桌面 43px、手机 34px；与文字并列时图片 alt 为空，独立使用时提供「霞光预报」名称。

## 浏览器标签页

浏览器入口使用 Logo A 的专用小尺寸衍生稿，不替换页头原始 Logo。保留暖黄日轮、浅蓝云朵和原始墨色；扩大主体，移除云内短线与底部划线。纸底不透明、纸外透明，深浅浏览器主题共用一套，不随天气或评分变化。

| 资产 | 用途 |
| --- | --- |
| favicon-a-16.png | 16×16 像素微型稿；移除光芒、加重主体轮廓 |
| favicon-a-32.png | 32×32 像素稿；保留三笔光芒，可用于 16 CSS px 的高密度显示 |
| favicon-a-48.png | 48×48 像素稿；同一详细构图的更高密度输出 |
| favicon-a-micro.png | 512×512 微型构图母稿，仅供审阅，不直接作为标签页资源 |
| favicon-a-detail.png | 512×512 详细构图母稿，仅供审阅，不替代页头 Logo |

标题保持「霞光预报」。浏览器标签页的字体、背景、圆角和关闭按钮由浏览器控制；全文小赖仅适用于网页内容，不能扩展到浏览器原生界面。

设计稿见 `SkyBrowserIdentity.dc.html`。源文件 `designs/paper-place-finder/project/draw-browser-mark.cjs`，通过 pen-pencil-art 的 `scripts/render.cjs` 渲染；固定 seed 为 `sky-letter-favicon-16-a1` / `sky-letter-favicon-32-a1`。采用钢笔轮廓与彩铅填色，再对软纸外缘做透明裁切；16px 是独立光学校正稿，不是直接缩小页头图片。

生产 `index.html` 已接入 16/32/48px 独立标签图标；192/512px 安装图标及 180px apple-touch-icon 使用同源 `favicon-a-detail.png` 详细稿。页面 Logo 仍保留原始 A 图，不拉伸小尺寸标签图。
