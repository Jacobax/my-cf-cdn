# CDN IP 自动更新 Worker

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-blue?style=flat-square)](https://workers.cloudflare.com/)

这是一个简单高效的 **Cloudflare Workers** 项目，用于自动化管理自定义 CDN 入口。

## 项目介绍

### 背景
如果你收集了一些优质 CDN 域名（如阿里云、Cloudflare 等），希望定期解析它们获取 IP 地址，  
然后汇总去重后更新到你的域名（如 `cdn.qmqm.cf`）的 DNS 记录中，  
这个 Worker 就能帮你实现！  

它支持定时触发（Cron），使用 Cloudflare 的 DoH API 解析域名，  
自动处理 IPv4 (A 记录) 和 IPv6 (AAAA 记录)，更新前先删除旧记录，避免冲突。  
适用于个人或小型项目构建高可用 CDN 代理。

### 核心功能
- **域名解析**：批量解析 CDN 域名 IP，支持 IPv4/IPv6。  
- **去重汇总**：使用 Set 确保 IP 唯一。  
- **DNS 更新**：通过 Cloudflare API 删除旧记录，添加新记录（不代理，直接返回 IP）。  
- **定时执行**：Cron 触发，例如每 6 小时运行一次。  

项目基于 JavaScript，无外部依赖，免费版 Workers 即可运行（适合 <100 域名）。

## 快速上手

### 前置准备
1. **Cloudflare 账户**：确保你的域名（如 `qmqm.cf`）已托管在 Cloudflare。  
   - 获取 **Zone ID**：Dashboard > 域名 > Overview。  
   - 创建 **API Token**：My Profile > API Tokens > Create Token > 编辑模板（权限：Zone:DNS:Edit，只限你的 Zone）。  

2. **CDN 域名列表**：准备一个数组，如 `['cdn1.example.com', 'cdn2.example.com']`。  

3. **GitHub 仓库**：Fork 或克隆此项目，将代码上传到你的仓库。

### 部署步骤
1. **创建 Worker**：  
   登录 [Cloudflare Dashboard](https://dash.cloudflare.com) > Workers & Pages > Create application > Create Worker。  

2. **上传代码**：  
   复制 `worker.js`（或主脚本）到 Worker 编辑器，保存。  

3. **设置环境变量**（Settings > Variables）：  
   - `CF_API_TOKEN`：你的 API Token。  
   - `ZONE_ID`：域名 Zone ID（如 `023e105f4ecef8ad9ca31a8372d0c353`）。  
   - `SUBDOMAIN`：子域名（如 `cdn`，对应 `cdn.qmqm.cf`）。  

4. **配置定时触发**：  
   Triggers > Add Cron trigger，例如 `0 */6 * * *`（每 6 小时运行）。  

5. **部署与测试**：  
   - 点击 Deploy。  
   - Triggers > Run manually 测试运行。  
   - 查看 Logs 检查日志（成功会打印 “DNS 更新完成”）。  
   - 验证：终端运行 `dig cdn.qmqm.cf` 或 `nslookup cdn.qmqm.cf`，检查 IP 是否更新。  

### 用法示例
- **自定义 CDN 列表**：在 `scheduled` 函数中修改 `cdnDomains` 数组。  
  ```javascript
  const cdnDomains = [
    'your-cdn1.com',
    'your-cdn2.com',
    // 添加更多...
  ];
  ```

- **调整 TTL**：代码中 `ttl: 1` 表示自动（Auto），可改为固定值如 `300`（5 分钟）。  

- **监控**：  
  Worker Logs 会记录解析失败或 API 错误。生产中可添加 Slack/Email 通知（扩展代码）。  

- **优化建议**：  
  - 如果域名 >50，添加 `Promise.all` 分批解析避免超时。  
  - 使用 KV Storage 缓存上次 IP，减少不必要更新。  
  - Cron 频率别太高（API 限 1200 req/min）。  

## 代码结构
- **主入口**：`export default { async scheduled(...) }` – 处理定时任务。  
- **parseDomainsToIPs**：解析域名，返回 { ipv4: [], ipv6: [] }。  
- **updateDNS**：删除旧记录 + 添加新记录。  

完整代码见 [worker.js](worker.js)。

## 注意事项
- **权限安全**：API Token 只给 DNS 编辑权限，避免全域访问。  
- **IPv6 支持**：如果 CDN 无 IPv6，AAAA 记录不会添加（正常）。  
- **限额**：免费 Workers CPU 10ms/请求，适合小规模；大项目升级付费。  
- **问题排查**：如果更新失败，检查 Token/Zone ID 是否正确，或分享 Logs 调试。  

## 贡献与反馈
欢迎 PR 或 Issue！如果有优化想法（如添加健康检查），随时提。  

**许可证**：MIT License – 自由使用、修改、分享。  

---

*作者：基于 Grok 辅助生成 | 更新于 2025-10-23*
