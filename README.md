# 霞光预报 · 晨昏观测手记 (FireCloud)

> 结合高空云层、远端光路与空气质量的自然霞光指数预报 · 天幕微物理气象手记

[![Verify Status](https://img.shields.io/badge/tests-61%20passed-success?style=flat-square)](tests/)
[![Architecture](https://img.shields.io/badge/architecture-Zero%20Dependencies%20%7C%20Vanilla%20ESM-blue?style=flat-square)](js/)
[![PWA](https://img.shields.io/badge/PWA-Offline%20Capable-orange?style=flat-square)](manifest.webmanifest)
[![Online Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-green?style=flat-square)](https://lumiaqian.github.io/firecloud/)

**在线体验**: [https://lumiaqian.github.io/firecloud/](https://lumiaqian.github.io/firecloud/)

---

## 📖 设计理念与视觉隐喻

「霞光预报」抛弃千篇一律的现代应用冷硬感与机械式的数据汇报，以**实体野外手札（Field Stationery Journal）**为核心设计语言。

界面融入手撕和纸票据、复古黄铜长尾夹、朱砂印泥、手撕和纸胶带与水彩试色条，将冰冷的气象接口数据转化为一本温润素雅的晨昏观测手记。

---

## ✨ 核心特性

* 🌅 **多维度霞光光路研判模型**
  * 深度融合高、中、低三层云量遮蔽度。
  * 沿太阳落入/升起方位角，向外延伸 6 个视距采样点（近端、中端、远端与侧翼对照点），精准评估远端光路通透性。
  * 结合空气相对湿度、视距能见度、气溶胶（AOD）、PM2.5 及沙尘指标，测算瑞利散射与余晖衰减。
  * 产出 0–99 经验量表分值，档位文字、行动建议与朱砂印章共用同一组分界：
    * **80–99 极佳**：值得专程等待 · 紫金印
    * **65–79 值得追**：值得追这场霞光 · 晴金印
    * **50–64 有机会**：可以顺路看看 · 柔光印
    * **35–49 一般**：有空可以留意 · 敛光印
    * **0–34 平淡**：不建议专程等待 · 微茫印

* 🧭 **观赏窗口与影响因素**
  * 主卡给出观赏窗口（起止与余晖峰值，按当天民用晨昏蒙影推算）与太阳方位，倒计时以窗口开始为准。
  * “影响因素”逐项列出各气象要素对指数的增减与理想区间，评分即这些增减之和，展示与评分始终一致。
  * 未来 7 日标出本周最佳一天，手机端提供七日分数概览；第 5–7 天标为远期参考。

* 🌧️ **真实气象微物理系统**
  * 基于当前实况天气驱动的纯 Canvas/物理运动学粒子引擎。
  * 细雨淅沥与暴雨飞溅碰撞、风雪粒子动力学、侧风轻抚纸页、雷暴引雷击打黄铜长尾夹震颤光效、暴雪积雪塌落等自然触感。

* 🌙 **夜巡月相札记与天体穹顶观测台**
  * 真实天文月相算法：实时测算照亮面比例、月龄朔望日、地平仰角、天球方位向。
  * 达芬奇辉光（地球照）底盘与水墨晕染月海流线，契合手札素描质感。
  * **天体穹顶观测台（Dev Lab）**：支持快捷键 `Shift + D` 或连续点击页面 Logo 3 次唤起，可实时调控地平线 2.0、开普勒、色差环等多款镜头动效与昼夜月相。快捷键仅在非编辑区域响应，不打断城市输入或输入法组合输入。

* **晨昏切换与加载反馈**
  * 同地点切换晚霞、朝霞时保留当前手记与阅读位置，在工具栏显示目标时段及暂留的手记，不使用全屏 loading。
  * 加载期间主卡与详情整体弱化，暂停旧内容交互；数据就绪后一次替换时段、分数与观测数据。
  * 立即切回当前手记时保留原数据新鲜度；过期请求的响应不会覆盖最新选择，有效缓存无需等待网络。
  * 切换失败时保留当前手记并明确提示未能读取的时段；键盘操作与减少动效模式停用切换动画和旋转提示。
  * 选择未来日期后，主卡分数、时间、倒计时、伴随指数、天空线索和观测指标统一按该日渲染；切换研判视角或刷新同地点、同时段预报时保留选中日期。
  * 切换到其他地点或成功读取另一晨昏时段后，日期回到该时段的下一场事件；失败或取消时段切换时保留原日期。
  * 缓存年龄由保存时间计算，切换日期或研判视角不会重置数据新鲜度。

* 🔒 **本机缓存与第三方查询**
  * 评分在浏览器内计算；最近地点、收藏、预报和界面偏好保存在当前浏览器，不保存城市搜索历史。
  * 城市检索向 Open-Meteo 发送关键词；天气和空气质量查询向 Open-Meteo 发送地点及采样点坐标；设备定位的逆地理编码向 BigDataCloud 发送定位坐标。
  * 收藏可逐一移出；最近地点、收藏与预报缓存可通过清除浏览器的网站数据删除。

* ⚡ **纯原生零依赖架构**
  * 零打包构建工具链（无 Webpack/Vite 负担），原生 ES Modules，毫秒级冷启动。
  * 全套 PWA Service Worker 离线缓存，离线仍可查看先前手札记录。

---

## 🛠️ 第三方气象与地理数据

应用所有测算完全在浏览器前端即时计算，数据直发公开第三方接口：

* **[Open-Meteo Forecast API](https://open-meteo.com/)**：获取高/中/低分层云量、空气湿度、能见度、降水、实况天气与风况。
* **[Open-Meteo Air Quality API](https://open-meteo.com/)**：获取气溶胶光学厚度（AOD）、PM2.5、沙尘等空气质量数据。
* **[Open-Meteo Geocoding API](https://open-meteo.com/)**：城市智能检索、去重与行政区划分。
* **[BigDataCloud Reverse Geocoding API](https://www.bigdatacloud.com/)**：设备 GPS 经纬度逆地址反查。

---

## 🚀 本地开发与测试

运行本项目无需安装任何第三方 npm 依赖包，仅需现代浏览器与 Node.js 22+（用于测试套件）：

### 启动本地静态服务

```bash
npm run dev
```

启动后在浏览器打开 `http://127.0.0.1:8765/` 即可体验。

### 测试与语法校验

```bash
# 检查全部 JavaScript 模块语法
npm run check

# 运行自动化单元测试套件 (node:test)
npm test

# 串联执行语法校验与测试套件 (部署前必查)
npm run verify
```

### 模块与缓存版本

页面通过 `index.html` 中的 import map 统一钉住各模块版本，Service Worker 预缓存同一组地址。新增或删除 `js/` 下的模块、或发布新版本时：

```bash
# 按实际模块重写 import map 与 sw.js 预缓存列表
npm run sync-modules

# 发布时同时把模块版本与 Service Worker 缓存名加一
npm run sync-modules -- --bump
```

---

## 🌐 自动化部署

仓库配置了 GitHub Actions 持续集成流水线（`.github/workflows/deploy-pages.yml`）：
每次向 `main` 分支提交代码时，流水线会自动执行 `npm run verify` 进行语法与逻辑测试，通过后一键上传静态资源并发布至 GitHub Pages。

---

## 📑 设计规范索引

关于晨昏观测手记完整的视觉规范、色彩令牌、排版规则、光影微物理与动效设计准则，请参阅：
* [design/DESIGN_SYSTEM.md](design/DESIGN_SYSTEM.md)

---

## ⚠️ 免责声明

天象变幻莫测，天际云幕与高空气流瞬息万变。本手札预报结果基于公开数值气象模型与经验量表估算，**仅供个人天文、摄影与观景出行参考**，不代表确定发生概率，亦不可替代官方气象部门发布的灾害性天气预警。
