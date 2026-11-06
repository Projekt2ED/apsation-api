# Supabase 配置

更新时间：2026-04-30

这份文档只保留当前 MVP 必须配置的内容。你不需要配置 Storage、Edge Functions、Realtime、OAuth、SMTP。

当前状态：已完成远程核查，`workspace_api_keys`、`playground_logs`、`async_tasks`、`token_hash` 和 `api_key_id` 可用。计费字段需要执行最新 `supabase/schema.sql` 后生效。

## 1. 填环境变量

进入 Supabase 控制台：

`Project Settings -> API`

把这 3 个值填到项目根目录 `.env.local`：

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

对应关系：

| Supabase 控制台字段 | 本地环境变量 |
| --- | --- |
| `Project URL` | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role secret` | `SUPABASE_SERVICE_ROLE_KEY` |

注意：

- `SUPABASE_SERVICE_ROLE_KEY` 不能和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 一样。
- `SUPABASE_SERVICE_ROLE_KEY` 不要加 `NEXT_PUBLIC_`，不能进入前端。
- 不需要把完整 Key 发到聊天里，保存到 `.env.local` 即可。

## 2. 执行数据库 SQL

进入 Supabase 控制台：

`SQL Editor -> New query`

把本地文件 `supabase/schema.sql` 全部复制进去，然后点 `Run`。

如果成功，通常会显示：

```text
Success. No rows returned
```

这个 SQL 可以重复执行。它会创建或补齐：

- `workspace_api_keys`
- `playground_logs`
- `async_tasks`
- `user_billing_accounts`
- `billing_recharge_orders`
- `billing_recharge_cards`
- `redeem_billing_recharge_card`
- `user_id`
- `token_hash`
- `api_key_id`
- `input_tokens`、`output_tokens`、`cached_input_tokens`
- `billable_amount`、`billing_currency`、`pricing_model`、`pricing_snapshot`
- RLS 读取策略
- 清理历史误写入的 `kind = 'system'` Key

## 3. 执行后检查

跑完 SQL 后，在 Supabase 里简单确认：

- `Table Editor` 能看到 `workspace_api_keys`
- `workspace_api_keys` 里有 `token_hash` 列
- `playground_logs` 里有 `api_key_id` 列
- `playground_logs` 里有 `billable_amount` 和 `pricing_snapshot` 列
- `playground_logs` 里有 `user_id` 列
- `async_tasks` 里有 `user_id` 列
- `billing_recharge_cards` 表已创建
- `redeem_billing_recharge_card` 函数已创建

然后本地重启：

```bash
npm run dev
```

## 4. 当前依赖

当前项目依赖 Supabase 完成这些能力：

- 用户注册 / 登录
- 工作台登录保护
- 平台 API Key 创建 / 吊销 / 鉴权
- Playground 请求日志落库
- 异步任务基础记录
- 用户数据按 `user_id` 隔离
- 基于 `playground_logs.billable_amount` 统计本月计费额度
- 基于 `user_billing_accounts.balance_cny` 控制用户余额，新用户默认 0
- 基于 `billing_recharge_orders` 预留充值订单
- 基于 `billing_recharge_cards` 发放和兑换一次性充值卡密
- 基于 `playground_logs` 记录 token、价格快照和本月预估费用
- 管理后台读取全站用户、Key、日志和任务

## 5. 安全边界

只能服务端读取：

- `UPSTREAM_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

前端允许读取：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Key 存储规则：

- 模型服务 Key 不写入数据库用户表。
- 平台发放给用户的完整 Key 只在创建成功时展示一次。
- 数据库只保存 `token_preview` 和 `token_hash`。
- 调用示例只显示 `YOUR_APSATION_API_KEY` 或 token preview。

## 6. 你配置完告诉我什么

你只需要告诉我：

- SQL 是否执行成功
- `.env.local` 是否已经保存
- 如果报错，把报错文本发我，不要发完整密钥
