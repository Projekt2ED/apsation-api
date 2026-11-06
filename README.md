# Apsation API

面向 ToB 的统一模型接入站点。当前第一版只保留核心产品入口：

- `模型列表`
- `Playground`
- `工作台`
- `定价与计费`

## 文档入口

当前只保留 3 份长期文档：

- [项目说明](./docs/project.md)：产品定位、路由、技术结构、安全边界
- [Supabase 配置](./docs/setup-supabase.md)：你现在需要操作的数据库和环境变量配置
- [待办清单](./docs/backlog.md)：未实现功能、优先级和后续排期

## 本地运行

```bash
npm install
npm run dev
```

打开：

```text
http://localhost:3000
```

## 环境变量

参考 `.env.example`，本地放到 `.env.local`：

```bash
UPSTREAM_API_BASE_URL=https://api.bltcy.ai
UPSTREAM_API_KEY=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

DEFAULT_ACCOUNT_BALANCE_CNY=0
RATE_LIMIT_WINDOW_SECONDS=60
RATE_LIMIT_MAX_REQUESTS=60
ADMIN_EMAILS=
```

说明：

- `UPSTREAM_API_BASE_URL` 可以填 `https://api.bltcy.ai`。
- `UPSTREAM_API_KEY`、`SUPABASE_SERVICE_ROLE_KEY` 只允许服务端读取。
- `SUPABASE_SERVICE_ROLE_KEY` 必须是 `service_role secret`，不能用 `anon public` 代替。
- `RATE_LIMIT_*` 是当前 MVP 的实例内限流配置。
- `DEFAULT_ACCOUNT_BALANCE_CNY` 是没有账务账户行时的兜底余额，生产建议保持 `0`。
- `ADMIN_EMAILS` 用英文逗号分隔，命中的登录邮箱才能访问 `/workspace/admin`。

## Supabase 初始化

配置步骤看：

[docs/setup-supabase.md](./docs/setup-supabase.md)

核心动作：

1. 在 `.env.local` 填 Supabase 三个变量。
2. 在 Supabase `SQL Editor` 执行 `supabase/schema.sql`。
3. 重启本地服务。

## 当前已开放外部 API

- `GET /v1/models`
- `POST /v1/chat/completions`
- `POST /v1/responses`
- `POST /v1/messages`
- `POST /v1/images/generations`
- `POST /v1/audio/speech`

鉴权：

```http
Authorization: Bearer aps_live_...
```

接入文档：

```text
/docs
```

## 验证

```bash
npm run lint
npm run build
```

## 计费说明

- 模型价格从平台价格源同步。
- token 类模型按输入、输出、缓存命中等 token 数估算。
- 图片、视频等固定计费模型按固定价格记录。
- 工作台 `/workspace/billing` 展示余额、本月预估费用、最近计费明细和模型价格表。
- 工作台 `/workspace/billing` 使用弹窗充值，支持管理员发放的卡密兑换。
- 在线充值已预留支付宝、微信支付入口，支付通道接入后返回收银台地址。
- 管理后台 `/workspace/admin` 可生成一次性充值卡密，明文只在生成时返回。
