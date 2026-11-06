import { RechargeForm } from "@/components/workspace/recharge-form";
import { WorkspacePageHeader } from "@/components/workspace/workspace-page-header";
import { requireCurrentUser } from "@/lib/auth";

export default async function WorkspaceRechargePage() {
  await requireCurrentUser("/workspace/billing/recharge");

  return (
    <div className="space-y-6">
      <div className="panel p-8">
        <WorkspacePageHeader
          title="充值"
          description="创建充值订单并预留支付通道接入位置。正式支付接入后，这里会跳转到支付页面。"
        />
      </div>

      <RechargeForm />
    </div>
  );
}
