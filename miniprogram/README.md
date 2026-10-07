# 见微 Genway · 微信小程序

移动端轻量客户端，对接同一 Express 后端（`/api/corpus`、`/api/analyze` 等）。完整情报中心、专题与管理台仍使用 Web。

## 页面

| 页 | 说明 |
|---|---|
| 情报 | `GET /api/corpus` + `GET /api/snapshot`，下拉刷新 / 搜索 |
| 详情 | 摘要、七要素、深读补全 `POST /api/enrich`、追问 `POST /api/ask-nuance` |
| 分析 | 粘贴新闻 → `POST /api/analyze` |
| 我的 | 配置 API 基址、健康检查、登录 / 退出 |
| 登录 | 账号密码或共享 `accessToken` → `POST /api/auth/login` |

认证只使用 `Authorization: Bearer` / `x-jianwei-token`，不依赖游客 Cookie。

## 本地打开

1. 安装[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 导入本目录（`miniprogram/`），AppID 可先用测试号；把 `project.config.json` 里的 `touristappid` 换成你的
3. 开发阶段：详情 → 本地设置 → 勾选「不校验合法域名」
4. 「我的」填写 API 基址：本机调试填 `http://127.0.0.1:3000`（需开发者工具与后端同机，或用局域网 IP）
5. 后端需已启动；若绑定非本机，按仓库 `publicExposure` 要求配置 Auth / Secret / TLS

## 正式发布前

1. 后端以 HTTPS 公网部署（`BIND_HOST=0.0.0.0` + `JIANWEI_BEHIND_TLS=1` 或进程 TLS，且配齐 `JIANWEI_AUTH_TOKEN` / `JIANWEI_SECRET` / 管理员）
2. 微信公众平台 → 开发管理 → 服务器域名 → request 合法域名加入你的 API 主机（不含路径、须备案域名）
3. 小程序内「我的」保存 `https://你的域名`
4. 上传代码并提交审核

## 设计说明

- 墨色报刊风，避免通用紫渐变模板感
- 无 Key / 空语料时展示诚实空态，与 Web 端一致
- Tab 图标为简易矢量导出 PNG，可按品牌替换 `assets/`
