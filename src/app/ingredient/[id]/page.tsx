import { PageHeader } from "@/components/common/page-header";

export default async function IngredientImpactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4 py-5">
      <PageHeader title={`Ingredient ${id}`} subtitle="Impact trend, confidence, and related symptoms." />
    </main>
  );
}
