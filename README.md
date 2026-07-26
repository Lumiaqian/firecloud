# 霞光预报

霞光预报是一个纯静态、无后端的 PWA，用于估算指定地点下一次朝霞或晚霞的可见程度。应用结合本地云量、太阳方向远端低云、能见度、湿度、降水、气溶胶和 PM2.5 等公开气象数据，生成 0-99 的霞光指数，并给出简短的天空线索。

## 产品边界

- 这是个人参考工具，不代表确定概率，也不替代专业气象预警。
- 项目保持纯静态架构：`index.html`、`css/`、`js/`、`icons/`、`manifest.webmanifest` 和 `sw.js` 可直接由任意静态文件服务托管。
- 没有构建步骤，没有应用后端，也没有数据库。

## 隐私边界

- 定位由浏览器原生 Geolocation API 触发，用户授权前不会读取当前位置。
- 位置信息只在浏览器端用于请求第三方公开接口，不会发送到本项目自有服务器。
- 收藏地点存储在本地浏览器中；清除浏览器站点数据会删除这些收藏。
- Service Worker 仅用于静态资源缓存，不做用户行为追踪。

## 第三方服务

应用运行时会直接从浏览器请求以下服务：

- Open-Meteo Forecast API：获取云量、湿度、能见度和降水预报。
- Open-Meteo Air Quality API：获取 AOD、PM2.5 和 dust 等空气质量数据。
- Open-Meteo Geocoding API：按城市名搜索地点。
- BigDataCloud Reverse Geocoding API：把设备经纬度转换为可读地点名。

这些请求受对应第三方服务的可用性、限流、隐私政策和网络状态影响。

## 本地启动

项目不需要安装依赖，直接启动本地静态服务：

```bash
npm run dev
```

然后访问 `http://127.0.0.1:8765/`。

## 测试与验证

需要 Node.js 22 或更新版本。

```bash
npm run check
npm test
npm run verify
```

- `npm run check`：检查现有 JavaScript 文件语法。
- `npm test`：运行 `tests/` 下的 `node:test` 单元测试。
- `npm run verify`：串联语法检查和测试，用于本地发布前验证。

## 部署

GitHub Pages 工作流位于 `.github/workflows/deploy-pages.yml`。当 `main` 分支收到 push 或手动触发工作流时，流程会：

1. 检出仓库。
2. 使用当前 Node LTS。
3. 执行 `npm run verify`。
4. 上传整个静态目录作为 Pages artifact。
5. 部署到 GitHub Pages。

由于项目没有构建产物，上传前不要生成或替换静态资源目录。
