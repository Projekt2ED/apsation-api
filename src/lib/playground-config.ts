export type PlaygroundMode = {
  id: "chat" | "responses" | "messages" | "images" | "audio" | "video";
  label: string;
  category: string;
  endpoint: string;
  method: "POST";
  description: string;
  notes: string[];
  defaultModel: string;
  placeholder: string;
  systemPrompt?: string;
  samplePrompts: string[];
  visible: boolean;
};

export const playgroundModes: PlaygroundMode[] = [
  {
    id: "chat",
    label: "聊天",
    category: "Text",
    endpoint: "/v1/chat/completions",
    method: "POST",
    description: "兼容对话",
    notes: ["兼容"],
    defaultModel: "gpt-5.5",
    placeholder: "写清目标、约束和期望输出",
    systemPrompt:
      "You are a helpful assistant. Focus on the requested outcome, preserve constraints, and answer in a clear, scannable format.",
    samplePrompts: [
      "目标：把产品需求整理成开发任务；成功标准：按优先级输出；格式：表格",
      "目标：优化首页标题文案；约束：专业、克制、不夸张；输出 5 个备选",
      "目标：把这段话改得更简洁；保留事实；输出修改后版本和修改理由",
    ],
    visible: true,
  },
  {
    id: "responses",
    label: "Responses",
    category: "Text",
    endpoint: "/v1/responses",
    method: "POST",
    description: "推荐协议",
    notes: ["GPT-5.5"],
    defaultModel: "gpt-5.5",
    placeholder: "写清目标、成功标准、必要上下文和输出格式",
    systemPrompt:
      "You are a production assistant. Work from the user's stated outcome, ask only when required context is missing, and keep the final answer concise and usable.",
    samplePrompts: [
      "目标：从这段会议记录提取待办；成功标准：负责人、截止时间、风险齐全；格式：Markdown 表格",
      "目标：生成客服回复；语气：温和直接；约束：不承诺未确认事项；输出：最终话术",
      "目标：评审这个 API 设计；成功标准：列出风险、改进建议和验收标准",
    ],
    visible: true,
  },
  {
    id: "messages",
    label: "Messages",
    category: "Text",
    endpoint: "/v1/messages",
    method: "POST",
    description: "兼容协议",
    notes: ["隐藏"],
    defaultModel: "claude-sonnet-4-6",
    placeholder: "输入内容",
    samplePrompts: ["生成一个标题"],
    visible: false,
  },
  {
    id: "images",
    label: "图像",
    category: "Image",
    endpoint: "/v1/images/generations",
    method: "POST",
    description: "图像生成",
    notes: ["生成"],
    defaultModel: "gpt-image-1",
    placeholder: "输入图像描述",
    samplePrompts: ["极简产品海报", "科技感应用图标", "白底电商主图"],
    visible: true,
  },
  {
    id: "audio",
    label: "语音",
    category: "Audio",
    endpoint: "/v1/audio/speech",
    method: "POST",
    description: "语音生成",
    notes: ["生成"],
    defaultModel: "gpt-4o-mini-tts",
    placeholder: "输入语音内容",
    samplePrompts: ["欢迎使用 Apsation API", "生成一段客服欢迎语", "用自然语气朗读这句话"],
    visible: true,
  },
  {
    id: "video",
    label: "视频",
    category: "Video",
    endpoint: "/v2/videos/generations",
    method: "POST",
    description: "视频生成",
    notes: ["异步"],
    defaultModel: "doubao-seedance-2-0",
    placeholder: "输入视频描述",
    samplePrompts: ["极简产品演示镜头", "城市夜景延时摄影", "一段干净的品牌开场动画"],
    visible: true,
  },
];
