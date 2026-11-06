import { ModelsCatalog } from "@/components/models/models-catalog";
import { getModelCatalog } from "@/lib/model-catalog";

export default async function ModelsPage() {
  const catalog = await getModelCatalog();

  return <ModelsCatalog catalog={catalog} />;
}
