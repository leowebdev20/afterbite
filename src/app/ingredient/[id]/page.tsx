export default async function IngredientImpactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md p-4">
      <h1 className="text-2xl font-semibold">Ingredient {id}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Impact trend, confidence, and related symptoms.</p>
    </main>
  );
}
