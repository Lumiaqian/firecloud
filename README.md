# 霞光预报 FireCloud

看看下一场朝霞或晚霞，值不值得等。

根据云层、太阳方向和空气质量估算观赏条件，提供日出日落时间、观赏窗口及未来七日趋势。界面采用「天空画笺」手绘风格：天气在天空中变化，预报写在纸上。

[在线使用](https://lumiaqian.github.io/firecloud/) · [构建状态](https://github.com/Lumiaqian/firecloud/actions/workflows/deploy-pages.yml)

## 功能

- 搜索城市或使用当前位置，收藏常用地点。
- 切换朝霞、晚霞，查看霞光指数与日轮指数。
- 查看观赏窗口、太阳方位，以及云层和空气质量对评分的影响。
- 浏览未来七日预报；夜间可查看月相、月亮方位和高度。
- 支持安装为 PWA，离线查看已保存的记录。天气动效可以关闭，也遵循系统的减少动态设置。

评分是 **0–99 的经验指数，不是出现概率**。未来第 5–7 日仅供参考，缓存记录不代表当前天气。请结合实际天况安排出行，不要将本项目用于灾害预警。

## 本地运行

使用原生 HTML、CSS 和 JavaScript ES Modules，无第三方 npm 依赖。开发需要 Node.js 22+ 和 Python 3。

```sh
npm run dev
```

打开 <http://127.0.0.1:8765/>。

```sh
npm run verify   # 语法检查与测试
npm run build    # 生成静态站点 dist/
```

预览发布产物：

```sh
python3 -m http.server 8766 --bind 127.0.0.1 --directory dist
```

## 代码与设计

| 路径 | 内容 |
| --- | --- |
| `js/forecast.mjs` | 天文计算、采样与评分 |
| `js/api.mjs` | 天气和地理数据请求 |
| `js/core/` | 预报状态、缓存与格式化 |
| `js/ui/` | 页面交互与视图 |
| `js/weather-fx.mjs` | 天气粒子动效 |
| `css/`、`assets/` | 生产样式、字体与手绘素材 |
| `tests/` | 自动化测试 |
| `designs/` | 设计稿与设计系统，不进入发布包 |

设计入口：[天空画笺设计系统](designs/sky-letter-system/project/README.md)、[桌面稿](designs/paper-place-finder/project/SkyLetterStudy.dc.html)、[手机稿](designs/paper-place-finder/project/SkyLetterMobile.dc.html)。字体使用[小赖](assets/fonts/Xiaolai-OFL.txt)，完整字体约 11.3 MiB，首次访问需要下载。

### 更新与部署

新增或删除模块后运行 `npm run sync-modules`，同步 import map 和预缓存列表。发布代码更新时运行 `npm run sync-modules -- --bump`，更新模块与应用壳缓存版本；修改 CSS 时还需更新 `index.html` 中对应样式表的版本号。

`css/sky-letter-tokens.css` 是设计系统生成令牌的生产副本，仅调整字体路径。颜色修改先更新设计系统，再同步生产副本，不分别维护两套数值。

推送到 `main` 后，GitHub Actions 执行检查、构建并将 `dist/` 部署到 GitHub Pages。构建会重建 `dist/`；发布资源白名单维护在 `scripts/build-site.mjs`。

## 数据与隐私

天气、空气质量和城市搜索使用 [Open-Meteo](https://open-meteo.com/)，设备定位后的地名查询使用 [BigDataCloud](https://www.bigdatacloud.com/)。评分在浏览器内计算。

城市搜索会发送关键词；天气查询会发送地点及周边采样坐标；逆地理编码会发送定位坐标。最近地点、收藏、预报和偏好保存在本机，不保存城市搜索历史，可通过清除浏览器的网站数据删除。

## 许可证

项目代码采用 [MIT](LICENSE)。字体遵循其附带的 OFL 许可证。
