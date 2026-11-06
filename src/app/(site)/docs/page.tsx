import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Braces,
  Clock3,
  Code2,
  FileJson,
  Image,
  KeyRound,
  ListTree,
  MessageSquareText,
  Mic2,
  ShieldAlert,
  TerminalSquare,
} from "lucide-react";

import { appRoutes } from "@/lib/app-routes";

const baseUrl = "https://your-domain.com/v1";

const navigation = [
  { href: "#quick-start", label: "快速开始" },
  { href: "#auth", label: "鉴权" },
  { href: "#models", label: "模型" },
  { href: "#text", label: "文本生成" },
  { href: "#image", label: "图片生成" },
  { href: "#audio", label: "语音合成" },
  { href: "#billing", label: "额度与计费" },
  { href: "#errors", label: "错误结构" },
] as const;

const endpointGroups = [
  {
    id: "models",
    title: "模型",
    description: "读取当前可用模型。模型名称以 `/models` 页面展示的主版本为准。",
    icon: ListTree,
    endpoints: [
      {
        method: "GET",
        path: "/v1/models",
        title: "列出模型",
        body: "返回模型 ID、提供方、能力分类和可用调用格式。",
      },
    ],
  },
  {
    id: "text",
    title: "文本生成",
    description: "面向对话、内容生成、推理和多模态文本任务。",
    icon: MessageSquareText,
    endpoints: [
      {
        method: "POST",
        path: "/v1/chat/completions",
        title: "Chat Completions",
        body: "兼容 OpenAI Chat Completions 请求格式。",
      },
      {
        method: "POST",
        path: "/v1/responses",
        title: "Responses",
        body: "适合统一文本、多模态输入和工具调用风格的响应生成。",
      },
      {
        method: "POST",
        path: "/v1/messages",
        title: "Messages",
        body: "兼容 Messages 风格请求，适合 Claude 系列模型。",
      },
    ],
  },
  {
    id: "image",
    title: "图片生成",
    description: "用于文生图、图片编辑和海报类生成。",
    icon: Image,
    endpoints: [
      {
        method: "POST",
        path: "/v1/images/generations",
        title: "Images",
        body: "提交 prompt、模型和图片参数，返回图片生成结果。",
      },
    ],
  },
  {
    id: "audio",
    title: "语音合成",
    description: "用于 TTS、语音预览和音频生成。",
    icon: Mic2,
    endpoints: [
      {
        method: "POST",
        path: "/v1/audio/speech",
        title: "Audio Speech",
        body: "提交文本、音色和模型，返回音频内容。",
      },
    ],
  },
] as const;

const chatCurl = `curl ${baseUrl}/chat/completions \\
  -H "Authorization: Bearer YOUR_APSATION_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-5.5",
    "messages": [
      { "role": "system", "content": "You are a concise assistant." },
      { "role": "user", "content": "写一个三句话的项目摘要" }
    ]
  }'`;

const responsesExample = `{
  "model": "gpt-5.5",
  "reasoning": { "effort": "medium" },
  "text": { "verbosity": "medium" },
  "input": [
    {
      "role": "user",
      "content": "把这段需求整理成开发任务"
    }
  ]
}`;

const messagesExample = `{
  "model": "claude-sonnet-4-6",
  "max_tokens": 1024,
  "messages": [
    { "role": "user", "content": "解释这段代码的作用" }
  ]
}`;

const imageExample = `{
  "model": "gpt-image-2",
  "prompt": "A clean SaaS dashboard screenshot, realistic UI",
  "size": "1024x1024"
}`;

const audioExample = `{
  "model": "gpt-4o-mini-tts",
  "voice": "alloy",
  "input": "欢迎使用 Apsation API"
}`;

const successExample = `{
  "id": "chatcmpl_xxx",
  "object": "chat.completion",
  "model": "gpt-5.5",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "..."
      }
    }
  ],
  "usage": {
    "prompt_tokens": 42,
    "completion_tokens": 128,
    "total_tokens": 170
  }
}`;

const errorExample = `{
  "error": {
    "code": "invalid_api_key",
    "message": "Invalid API key.",
    "status": 401
  }
}

{
  "error": {
    "code": "monthly_quota_exceeded",
    "message": "Monthly billing quota exceeded.",
    "status": 429
  },
  "quota": {
    "limit": 1000,
    "used": 1000,
    "remaining": 0,
    "currency": "CNY",
    "resetAt": "2026-06-01T00:00:00.000Z"
  }
}`;

function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-[color:rgba(17,17,15,0.96)] text-white">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-xs uppercase tracking-[0.18em] text-white/55">
        <Code2 className="h-3.5 w-3.5" />
        {title}
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-all p-4 text-[12px] leading-6 text-white/88">
        {code}
      </pre>
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  return (
    <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium text-[var(--accent)]">
      {method}
    </span>
  );
}

function SectionTitle({
  id,
  icon: Icon,
  title,
  description,
}: {
  id: string;
  icon: typeof BookOpen;
  title: string;
  description: string;
}) {
  return (
    <div id={id} className="scroll-mt-24 border-b border-[var(--line)] px-6 py-5 sm:px-7">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-white/75 text-[var(--ink)]">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-semibold text-[var(--ink)]">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{description}</p>
        </div>
      </div>
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <main className="site-shell section-space">
      <section className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden xl:block">
          <div className="sticky top-6 space-y-3">
            <div className="panel p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--ink)]">
                <BookOpen className="h-4 w-4" />
                API Reference
              </div>
              <nav className="mt-4 grid gap-1">
                {navigation.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="rounded-lg px-3 py-2 text-sm text-[var(--muted)] hover:bg-white/70 hover:text-[var(--ink)]"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          <section className="panel p-6 sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/60 px-3 py-1 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              <BookOpen className="h-3.5 w-3.5" />
              API Docs
            </div>

            <h1 className="mt-6 max-w-4xl font-display text-4xl font-semibold leading-tight text-[var(--ink)] sm:text-6xl">
              Apsation API 接入文档
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--muted)]">
              使用统一 `/v1` 接口接入模型能力。本文按鉴权、模型、文本、图片、语音、额度和错误结构分层整理。
            </p>

            <div className="mt-8 grid gap-3 lg:grid-cols-2">
              <div className="rounded-lg border border-[var(--line)] bg-white/65 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--ink)]">
                  <TerminalSquare className="h-4 w-4" />
                  Base URL
                </div>
                <div className="mt-3 overflow-x-auto rounded-lg bg-white/75 px-4 py-3 font-mono text-sm text-[var(--ink)]">
                  {baseUrl}
                </div>
              </div>

              <div className="rounded-lg border border-[var(--line)] bg-white/65 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--ink)]">
                  <KeyRound className="h-4 w-4" />
                  API Key
                </div>
                <div className="mt-3 overflow-x-auto rounded-lg bg-white/75 px-4 py-3 font-mono text-sm text-[var(--ink)]">
                  Authorization: Bearer YOUR_APSATION_API_KEY
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={appRoutes.workspaceKeys} className="primary-button">
                获取 API Key
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href={appRoutes.models} className="subtle-button">
                查看模型列表
              </Link>
            </div>
          </section>

          <section id="quick-start" className="panel overflow-hidden scroll-mt-24">
            <SectionTitle
              id="quick-start-title"
              icon={TerminalSquare}
              title="快速开始"
              description="最小可运行请求只需要 Base URL、平台 Key、模型名和请求体。"
            />
            <div className="grid gap-5 p-6 sm:p-7 xl:grid-cols-[minmax(0,1fr)_340px]">
              <CodeBlock title="curl" code={chatCurl} />
              <div className="space-y-3 text-sm leading-7 text-[var(--muted)]">
                <div className="rounded-lg border border-[var(--line)] bg-white/65 p-4">
                  <div className="font-medium text-[var(--ink)]">请求顺序</div>
                  <ol className="mt-3 list-decimal space-y-2 pl-5">
                    <li>在工作台创建平台 Key。</li>
                    <li>从模型列表选择模型 ID。</li>
                    <li>按对应接口提交 JSON 请求。</li>
                    <li>在工作台查看调用日志、tokens 和预估费用。</li>
                  </ol>
                </div>
                <div className="rounded-lg border border-[var(--line)] bg-white/65 p-4">
                  请求体保持常见模型 API 格式，平台负责鉴权、模型映射、额度检查、日志和计费记录。
                </div>
              </div>
            </div>
          </section>

          <section id="auth" className="panel overflow-hidden scroll-mt-24">
            <SectionTitle
              id="auth-title"
              icon={KeyRound}
              title="鉴权"
              description="所有推理接口都需要 Bearer Token。`GET /v1/models` 也使用相同鉴权方式。"
            />
            <div className="grid gap-4 p-6 sm:p-7 md:grid-cols-3">
              <div className="rounded-lg border border-[var(--line)] bg-white/65 p-4">
                <div className="text-sm font-medium text-[var(--ink)]">Header</div>
                <div className="mt-3 font-mono text-xs leading-6 text-[var(--muted)]">
                  Authorization: Bearer aps_live_...
                </div>
              </div>
              <div className="rounded-lg border border-[var(--line)] bg-white/65 p-4">
                <div className="text-sm font-medium text-[var(--ink)]">Key 状态</div>
                <div className="mt-3 text-sm leading-7 text-[var(--muted)]">
                  只有 active Key 可以调用；已吊销 Key 返回 `401`。
                </div>
              </div>
              <div className="rounded-lg border border-[var(--line)] bg-white/65 p-4">
                <div className="text-sm font-medium text-[var(--ink)]">安全提示</div>
                <div className="mt-3 text-sm leading-7 text-[var(--muted)]">
                  完整 Key 只在创建成功时展示一次，请保存在服务端环境变量中。
                </div>
              </div>
            </div>
          </section>

          {endpointGroups.map((group) => (
            <section key={group.id} id={group.id} className="panel overflow-hidden scroll-mt-24">
              <SectionTitle
                id={`${group.id}-title`}
                icon={group.icon}
                title={group.title}
                description={group.description}
              />
              <div className="divide-y divide-[var(--line)]">
                {group.endpoints.map((endpoint) => (
                  <div key={endpoint.path} className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_300px]">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <MethodBadge method={endpoint.method} />
                        <span className="font-mono text-sm text-[var(--ink)]">
                          {endpoint.path}
                        </span>
                      </div>
                      <h3 className="mt-4 font-display text-2xl font-semibold text-[var(--ink)]">
                        {endpoint.title}
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                        {endpoint.body}
                      </p>
                    </div>
                    <div className="rounded-lg border border-[var(--line)] bg-white/65 p-4 text-sm leading-7 text-[var(--muted)]">
                      <div className="font-medium text-[var(--ink)]">通用规则</div>
                      <p className="mt-2">请求和响应均为 JSON，音频接口可能返回二进制音频。</p>
                      <p>模型 ID 可传主版本名，也可传模型列表中展示的细分版本。</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="panel overflow-hidden">
              <SectionTitle
                id="request-examples"
                icon={Braces}
                title="请求示例"
                description="按接口类型选择对应请求体。"
              />
              <div className="grid gap-4 p-6 sm:p-7">
                <CodeBlock title="Responses" code={responsesExample} />
                <CodeBlock title="Messages" code={messagesExample} />
                <CodeBlock title="Images" code={imageExample} />
                <CodeBlock title="Audio" code={audioExample} />
              </div>
            </div>

            <div className="panel overflow-hidden">
              <SectionTitle
                id="response-examples"
                icon={FileJson}
                title="响应示例"
                description="响应结构随接口类型变化，`usage` 字段会用于日志和计费估算。"
              />
              <div className="p-6 sm:p-7">
                <CodeBlock title="success" code={successExample} />
              </div>
            </div>
          </section>

          <section id="billing" className="panel overflow-hidden scroll-mt-24">
            <SectionTitle
              id="billing-title"
              icon={Clock3}
              title="额度与计费"
              description="平台按实际预估费用限制用量，并记录每次调用的 tokens、价格快照和预估费用。"
            />
            <div className="grid gap-4 p-6 sm:p-7 md:grid-cols-3">
              <div className="rounded-lg border border-[var(--line)] bg-white/65 p-4">
                <div className="text-sm font-medium text-[var(--ink)]">月度金额额度</div>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                  超出月度计费额度会返回 `429 monthly_quota_exceeded`。
                </p>
              </div>
              <div className="rounded-lg border border-[var(--line)] bg-white/65 p-4">
                <div className="text-sm font-medium text-[var(--ink)]">频率限制</div>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                  触发限流会返回 `429 rate_limit_exceeded`，响应中包含重试秒数。
                </p>
              </div>
              <div className="rounded-lg border border-[var(--line)] bg-white/65 p-4">
                <div className="text-sm font-medium text-[var(--ink)]">账单明细</div>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                  在工作台计费页查看本月预估费用和最近调用明细。
                </p>
              </div>
            </div>
          </section>

          <section id="errors" className="panel overflow-hidden scroll-mt-24">
            <SectionTitle
              id="errors-title"
              icon={ShieldAlert}
              title="错误结构"
              description="错误响应统一包含 `error.code`、`error.message` 和 `error.status`。"
            />
            <div className="grid gap-5 p-6 sm:p-7 xl:grid-cols-[minmax(0,1fr)_320px]">
              <CodeBlock title="error" code={errorExample} />
              <div className="space-y-3">
                {[
                  ["invalid_api_key", "Key 缺失、无效或已吊销。"],
                  ["unsupported_route", "接口路径暂未开放。"],
                  ["monthly_quota_exceeded", "月度计费额度已用完。"],
                  ["rate_limit_exceeded", "请求频率超过当前限制。"],
                  ["model_service_not_configured", "模型服务配置未完成。"],
                ].map(([code, description]) => (
                  <div key={code} className="rounded-lg border border-[var(--line)] bg-white/65 p-4">
                    <div className="font-mono text-xs text-[var(--ink)]">{code}</div>
                    <div className="mt-2 text-sm leading-7 text-[var(--muted)]">
                      {description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
