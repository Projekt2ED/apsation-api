# Apsation API 待办清单

更新时间：2026-04-30

使用方式：你直接在 `优先级` 列填写 `P0 / P1 / P2`，后续开发按这份清单推进。

状态说明：

- `todo`：未开始
- `blocked`：依赖未满足
- `in_progress`：进行中
- `done`：已完成
- `optional`：可选

## 1. 当前已完成

| ID       | 模块         | 事项                              | 状态   |
| -------- | ---------- | ------------------------------- | ---- |
| DONE-001 | 信息架构       | 顶层入口统一为首页、模型列表、Playground、工作台   | done |
| DONE-002 | 模型列表       | 模型目录实时拉取、分类、去重、失败回退             | done |
| DONE-003 | Playground | 聊天式 Playground 和真实模型调用          | done |
| DONE-004 | 用户体系       | Supabase 注册、登录、工作台保护            | done |
| DONE-005 | 工作台        | 概览、Key 管理、调用日志、异步任务基础页          | done |
| DONE-006 | API Key    | 平台 Key 创建、一次性明文展示、吊销、鉴权         | done |
| DONE-007 | 外部 API     | `/v1/models`、文本、图片、语音接口代理       | done |
| DONE-008 | 安全         | 模型服务 Key 与前端 / 用户工作台隔离            | done |
| DONE-009 | 构建         | 移除构建期 Google Fonts 远程依赖         | done |
| DONE-010 | Supabase   | 远程表结构补齐 `token_hash`，历史敏感行核查为 0 | done |
| DONE-011 | API 文档     | 新增 `/docs` API 文档页和基础调用示例       | done |
| DONE-012 | 配额         | 增加每用户每月基础计费额度和工作台额度展示           | done |
| DONE-013 | 消耗记录       | 基于 `playground_logs` 记录并统计实际费用  | done |
| DONE-014 | 管理后台       | 增加 `/workspace/admin` 运营视角      | done |
| DONE-015 | 限流         | 增加按用户 / 平台 Key 的实例内窗口限流         | done |
| DONE-016 | API Key    | 增加按 Key 统计本月调用量                 | done |
| DONE-017 | 计费         | 新用户默认余额 0，增加账务账户和充值订单预留       | done |
| DONE-018 | 充值         | 增加管理员发卡、用户卡密兑换和弹窗充值入口         | done |

## 2. 需要你先配置

| ID       | 模块       | 事项                                         | 状态   | 优先级    | 备注                                   |
| -------- | -------- | ------------------------------------------ | ---- | ------ | ------------------------------------ |
| DATA-001 | Supabase | 执行最新 `supabase/schema.sql`，补齐 `token_hash` | done | <br /> | 已远程核查表结构                             |
| DATA-002 | Supabase | 确认 RLS policy 已更新，排除 `kind = 'system'`     | done | <br /> | 已用临时登录用户验证：只能读 `issued`，读不到 `system` |
| DATA-003 | Supabase | 执行最新 `supabase/schema.sql`，创建卡密表和兑换函数 | todo | p0 | 卡密兑换依赖 `billing_recharge_cards` 和 `redeem_billing_recharge_card` |

## 3. 建议优先判断

| ID       | 模块      | 事项                | 状态   | 优先级    | 备注                       |
| -------- | ------- | ----------------- | ---- | ------ | ------------------------ |
| OPS-001  | 限流      | 增加按 Key / 用户限流    | done | p2     | 当前为实例内限流，多实例后升级 Redis    |
| BILL-001 | 配额      | 增加用户基础调用额度        | done | p0     | 当前按每用户每月预估费用控制            |
| BILL-002 | 消耗记录    | 记录请求消耗维度          | done | p0     | 当前消耗单位为模型实际预估价格              |
| KEY-001  | API Key | 增加 Key 权限范围控制     | todo | <br /> | 当前 Key 是全权限              |
| KEY-002  | API Key | 增加 Key 过期时间       | todo | <br /> | 企业场景常用                   |
| KEY-003  | API Key | 增加按 Key 统计调用量     | done | p2     | 已远程验证 `api_key_id` 写入和统计 |
| DATA-004 | 管理后台    | 管理员查看用户、Key、日志、任务 | done | p1     | 通过 `ADMIN_EMAILS` 控制访问   |

## 4. 可后置功能

| ID       | 模块      | 事项                        | 状态       | 优先级    | 备注                     |
| -------- | ------- | ------------------------- | -------- | ------ | ---------------------- |
| CORE-003 | 外部 API  | 开放视频相关对外接口                | todo     | <br /> | 你已说视频异步先放              |
| CORE-004 | 外部 API  | 增加 embeddings / rerank 接口 | todo     | <br /> | 看后续业务需求                |
| CORE-005 | 错误处理    | 统一错误码和错误结构                | todo     | p0     | 当前仍有部分错误透传               |
| TASK-001 | 异步任务    | 增加任务主动轮询                  | todo     | <br /> | 视频链路恢复时做               |
| TASK-002 | 异步任务    | 增加任务手动刷新                  | todo     | <br /> | 工作台体验项                 |
| TASK-003 | 异步任务    | 自动回填结果 URL / 最终状态         | todo     | <br /> | 异步闭环                   |
| ORG-001  | 组织      | 增加组织 / 团队模型               | todo     | <br /> | ToB 后续常见需求             |
| ORG-002  | 组织      | 成员邀请和角色权限                 | todo     | <br /> | owner / admin / member |
| BILL-003 | 计费      | 账单明细                      | done     | p0     | 已增加定价同步、计费日志字段和 `/workspace/billing` |
| BILL-004 | 支付      | 在线充值 / 套餐购买               | todo     | <br /> | 已预留支付宝和微信支付入口，待接入真实支付通道              |
| OPS-002  | 风控      | IP 级防滥用策略                 | todo     | <br /> | 公开发放 Key 后更重要          |
| OPS-003  | 监控      | 失败率、慢请求监控                 | todo     | <br /> | 当前只靠日志表                |
| KEY-004  | API Key | Key 重命名 / 轮换 / 删除         | optional | p2     | 管理体验优化                 |

## 5. 下一步推荐

下一步建议优先从这 4 个里选：

- `CORE-005` 统一错误结构
- `KEY-004` Key 重命名 / 轮换 / 删除
- `KEY-001` Key 权限范围控制
- `KEY-002` Key 过期时间
