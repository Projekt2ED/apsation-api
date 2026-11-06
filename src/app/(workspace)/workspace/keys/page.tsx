import { WorkspaceKeysManager } from "@/components/workspace/workspace-keys-manager";
import { WorkspacePageHeader } from "@/components/workspace/workspace-page-header";
import { requireCurrentUser } from "@/lib/auth";
import { getWorkspaceKeys } from "@/lib/workspace-data";

export default async function WorkspaceKeysPage() {
  const user = await requireCurrentUser();
  const keys = await getWorkspaceKeys(user.id);

  return (
    <div className="space-y-6">
      <div className="panel p-8">
        <WorkspacePageHeader
          title="Key 管理"
          description="创建平台 API Key，并在这里查看和吊销。"
        />
      </div>

      <WorkspaceKeysManager initialKeys={keys} />
    </div>
  );
}
