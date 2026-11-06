import { handlePlatformApiRequest } from "@/lib/platform-api-proxy";

type RouteContext = {
  params: Promise<{
    slug: string[];
  }>;
};

function buildEndpoint(slug: string[]) {
  return `/${["v1", ...slug].join("/")}`;
}

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  return handlePlatformApiRequest(request, buildEndpoint(slug));
}

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  return handlePlatformApiRequest(request, buildEndpoint(slug));
}
