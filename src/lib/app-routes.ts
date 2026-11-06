export const appRoutes = {
  home: "/",
  login: "/login",
  authCallback: "/auth/callback",
  models: "/models",
  playground: "/playground",
  docs: "/docs",
  workspace: "/workspace",
  workspaceKeys: "/workspace/keys",
  workspaceLogs: "/workspace/logs",
  workspaceBilling: "/workspace/billing",
  workspaceRecharge: "/workspace/billing/recharge",
  workspaceTasks: "/workspace/tasks",
  workspaceAdmin: "/workspace/admin",
  apiPlayground: "/api/playground",
} as const;

export type AppRoute = (typeof appRoutes)[keyof typeof appRoutes];

export type NavigationItem = {
  href: AppRoute;
  label: string;
  description: string;
};

export const primaryNavigation: readonly NavigationItem[] = [
  {
    href: appRoutes.models,
    label: "模型列表",
    description: "查看全部模型",
  },
  {
    href: appRoutes.playground,
    label: "Playground",
    description: "在线体验入口",
  },
  {
    href: appRoutes.docs,
    label: "API 文档",
    description: "接入与示例",
  },
  {
    href: appRoutes.workspace,
    label: "工作台",
    description: "Key、日志与任务",
  },
] as const;

export const workspaceNavigation: readonly NavigationItem[] = [
  {
    href: appRoutes.workspace,
    label: "概览",
    description: "工作台首页",
  },
  {
    href: appRoutes.workspaceKeys,
    label: "Key 管理",
    description: "令牌与权限",
  },
  {
    href: appRoutes.workspaceLogs,
    label: "调用日志",
    description: "请求记录与耗时",
  },
  {
    href: appRoutes.workspaceBilling,
    label: "计费",
    description: "价格与账单",
  },
  {
    href: appRoutes.workspaceTasks,
    label: "异步任务",
    description: "任务状态与结果",
  },
  {
    href: appRoutes.workspaceAdmin,
    label: "管理后台",
    description: "运营视角",
  },
] as const;

export const productSurfaces = [
  {
    href: appRoutes.playground,
    title: "Playground",
    body: "聊天、图像、语音、视频统一体验。",
  },
  {
    href: appRoutes.models,
    title: "模型列表",
    body: "按厂商和类别查看全部模型。",
  },
  {
    href: appRoutes.workspace,
    title: "工作台",
    body: "管理 Key、日志和任务。",
  },
] as const;

export const legacyRedirects = [
  { source: "/console", destination: appRoutes.workspace },
  { source: "/console/playground", destination: appRoutes.playground },
  { source: "/console/tokens", destination: appRoutes.workspaceKeys },
  { source: "/console/logs", destination: appRoutes.workspaceLogs },
  { source: "/console/tasks", destination: appRoutes.workspaceTasks },
  { source: "/faq", destination: appRoutes.home },
  { source: "/announcements", destination: appRoutes.home },
  { source: "/contact", destination: appRoutes.home },
] as const;

export function isRouteActive(pathname: string, href: string) {
  if (href === appRoutes.home) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
