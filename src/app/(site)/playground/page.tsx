import { Suspense } from "react";

import { PlaygroundWorkbench } from "@/components/playground/playground-workbench";
import { getModelCatalog } from "@/lib/model-catalog";

export default async function PlaygroundPage() {
  const catalog = await getModelCatalog();

  return (
    <div className="site-shell section-space">
      <Suspense
        fallback={
          <section className="panel min-h-[720px] animate-pulse bg-[color:rgba(255,255,255,0.42)]" />
        }
      >
        <PlaygroundWorkbench
          catalogSections={catalog.sections}
          modelSuggestions={catalog.suggestions}
        />
      </Suspense>
    </div>
  );
}
