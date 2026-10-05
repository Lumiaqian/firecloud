# 霞光预报 · 晨昏观测手记 (FireCloud)

> 结合高空云层、远端光路与空气质量的自然霞光指数预报 · 天幕微物理气象手记

[![Verify Status](https://img.shields.io/badge/tests-32%20passed-success?style=flat-square)](tests/)
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
  * 产出 0–99 经验量表分值，并盖上专属朱砂印章研判：
    * **紫金**（85–99 分 · 绝艳霞天）
    * **晴金**（70–84 分 · 绚彩可期）
    * **柔光**（50–69 分 · 浮云堪赏）
    * **敛光**（30–49 分 · 云厚光微）
    * **微茫**（0–29 分 · 且待新晴）

* 🌧️ **真实气象微物理系统**
  * 基于当前实况天气驱动的纯 Canvas/物理运动学粒子引擎。
  * 细雨淅沥与暴雨飞溅碰撞、风雪粒子动力学、侧风轻抚纸页、雷暴引雷击打黄铜长尾夹震颤光效、暴雪积雪塌落等自然触感。

* 🌙 **夜巡月相札记与天体穹顶观测台**
  * 真实天文月相算法：实时测算照亮面比例、月龄朔望日、地平仰角、天球方位向。
  * 达芬奇辉光（地球照）底盘与水墨晕染月海流线，契合手札素描质感。
  * **天体穹顶观测台（Dev Lab）**：支持快捷键 `Shift + D` 或连续点击页面 Logo 3 次随时唤起，可实时调控地平线 2.0、开普勒、色差环等多款镜头动效与昼夜月相。

* **晨昏切换与加载反馈**
  * 同地点切换晚霞、朝霞时保留当前手记与阅读位置，在工具栏显示目标时段及暂留的手记，不使用全屏 loading。
  * 加载期间主卡与详情整体弱化，暂停旧内容交互；数据就绪后一次替换时段、分数与观测数据。
  * 立即切回当前手记时保留原数据新鲜度；过期请求的响应不会覆盖最新选择，有效缓存无需等待网络。
  * 切换失败时保留当前手记并明确提示未能读取的时段；键盘操作与减少动效模式停用切换动画和旋转提示。

* 🔒 **纯本地隐私与零留存**
  * **纯本地即时测算**：不收集、不上报、不留存任何用户定位信息、搜索历史与浏览轨迹。
  * 地点收藏仅保存在当前浏览器的 LocalStorage 中，可随时一键移出与清空。

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
