# Apsation API 项目说明

更新时间：2026-04-30

## 1. 产品定位

Apsation API 是面向 ToB 的统一模型接入站点，不是传统公司官网，也不是泛后台。

第一版只保留三个核心产品入口：

- 模型列表
- Playground
- 工作台

第一版不做：

- 正式在线支付
- 大量营销页
- FAQ / 公告 / 联系接入等非核心页面
- 多套导航互相嵌套

## 2. 当前路由

正式路由：

| 路由 | 用途 |
| --- | --- |
| `/` | 首页分发 |
| `/login` | 登录 / 注册 |
| `/models` | 模型列表 |
| `/playground` | 在线操场 |
| `/docs` | API 文档 |
| `/workspace` | 工作台概览 |
| `/workspace/keys` | API Key 管理 |
| `/workspace/logs` | 调用日志 |
| `/workspace/billing` | 定价与计费 |
| `/workspace/tasks` | 异步任务 |
| `/workspace/admin` | 管理后台 |

兼容重定向：

| 旧路由 | 新路由 |
| --- | --- |
| `/console` | `/workspace` |
| `/console/playground` | `/playground` |
| `/console/tokens` | `/workspace/keys` |
| `/console/logs` | `/workspace/logs` |
| `/console/tasks` | `/workspace/tasks` |

## 3. 当前已开放外部 API

- `GET /v1/models`
- `POST /v1/chat/completions`
- `POST /v1/responses`
- `POST /v1/messages`
- `POST /v1/images/generations`
- `POST /v1/audio/speech`

鉴权方式：

```http
Authorization: Bearer aps_live_...
```

## 4. 技术结构

技术栈：

- `Next.js 16`
- `React 19`
- `TypeScript`
- `Tailwind CSS 4`
- `Supabase`

主要目录：

```text
src/
  app/
    (site)/
    (workspace)/
    api/
    v1/
  components/
    models/
    playground/
    site/
    workspace/
  lib/
    billing.ts
    model-catalog.ts
    platform-api-keys.ts
    platform-api-proxy.ts
    supabase-admin.ts
    workspace-data.ts
supabase/
  schema.sql
```

## 5. 核心数据流

模型列表：

- `src/lib/model-catalog.ts`
- 从模型服务 `/v1/models` 拉取
- 自动去重、分类、失败回退

Playground：

- `src/app/api/playground/route.ts`
- 前端只调用本站 API
- 服务端使用模型服务 Key 转发
- 请求结果写入 `playground_logs`
- 异步任务基础信息写入 `async_tasks`

外部 Wrapper API：

- `src/app/v1/[...slug]/route.ts`
- `src/lib/platform-api-proxy.ts`
- 用户使用平台 Key 调用
- 服务端鉴权后转发模型请求
- 更新 Key 最后使用时间和调用日志

平台 API Key：

- `src/lib/platform-api-keys.ts`
- 创建时返回一次完整 `aps_live_...`
- 数据库只保存 `token_preview` 和 `token_hash`
- 鉴权时对请求 Key 做 hash 比对
- 工作台按 `api_key_id` 统计每个 Key 的本月调用量

基础配额：

- `src/lib/quota.ts`
- 当前以每用户每月实际预估费用作为消耗单位
- 新用户默认余额为 0
- `DEFAULT_ACCOUNT_BALANCE_CNY` 只作为无账务账户行时的兜底余额，生产建议保持 0
- Playground 和外部 `/v1/*` 推理接口都会检查额度
- `/v1/models` 不计入计费额度

定价与计费：

- `src/lib/billing.ts`
- 从平台价格源同步所有可见模型价格
- token 类模型按 `model_ratio * 2` 得到输入单价，输出单价再乘 `completion_ratio`
- 固定计费模型按价格源中的固定价格和单位记录
- Playground 和外部 `/v1/*` 调用会解析 `usage`，把 token、预估金额和价格快照写入 `playground_logs`
- `/workspace/billing` 展示本月预估、最近计费明细和模型价格表
- 当前已预留充值订单入口，不做真实支付扣款；后续接入支付通道后更新余额

限流：

- `src/lib/rate-limit.ts`
- 当前为实例内窗口限流
- Playground 按用户限流
- 外部 `/v1/*` 按平台 Key 限流
- 默认 `RATE_LIMIT_WINDOW_SECONDS=60`、`RATE_LIMIT_MAX_REQUESTS=60`
- 多实例部署后需要升级到 Redis / Upstash 这类集中式限流

管理后台：

- `/workspace/admin`
- 通过 `ADMIN_EMAILS` 指定允许访问的管理员邮箱
- 使用 Supabase service role 查询全站用户、Key、日志和任务
- 页面只展示 token preview，不展示 hash、notes、模型服务 Key 或完整用户 Key

## 6. 安全边界

只能服务端读取：

- `UPSTREAM_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

允许前端读取：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

明确禁止：

- 把模型服务 Key 写入 `workspace_api_keys`
- 在用户工作台展示模型服务 Key
- 在模型调用示例里二次回显完整用户 Key
- 在数据库持久化可解密的平台 Key secret

## 7. 当前验证

最近一次本地验证：

```bash
npm run lint
npm run build
```

结果：均通过。

敏感搜索结论：

- 前端未读取 `UPSTREAM_API_KEY`
- 前端未读取 `SUPABASE_SERVICE_ROLE_KEY`
- 未发现旧的可解密 `secret_box` 存储逻辑

## 8. 当前未实现重点

- 统一错误码和错误结构
- 视频异步 API 完整闭环（已后置）
- 组织 / 团队 / 角色
