import { PageHeader } from "@/components/common/page-header";

export default function RecipesPage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4 py-5">
      <PageHeader title="Recipe Builder" subtitle="Compose ingredients and preview predicted impact." />
    </main>
  );
}
