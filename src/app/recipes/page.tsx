"use client";

import { FormEvent, useMemo, useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { api } from "@/trpc/client";

export default function RecipesPage() {
  const utils = api.useUtils();
  const [recipeName, setRecipeName] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Array<{ id: string; name: string }>>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const ingredientQuery = api.meal.searchIngredients.useQuery(
    { query: query.trim() || "a" },
    { enabled: query.trim().length > 0 }
  );
  const recipes = api.recipe.listRecipes.useQuery();
  const createRecipe = api.recipe.createRecipe.useMutation();
  const updateRecipe = api.recipe.updateRecipe.useMutation();
  const deleteRecipe = api.recipe.deleteRecipe.useMutation();
  const createIngredient = api.meal.createIngredient.useMutation();

  const ingredientIds = useMemo(() => selected.map((item) => item.id), [selected]);

  const prediction = api.recipe.predictRecipeImpact.useQuery(
    { ingredientIds },
    { enabled: ingredientIds.length > 0 }
  );

  const onSelectIngredient = (ingredient: { id: string; name: string }) => {
    setSelected((prev) => (prev.some((item) => item.id === ingredient.id) ? prev : [...prev, ingredient]));
    setQuery("");
  };

  const onCreateCustomIngredient = async () => {
    const name = query.trim();
    if (name.length < 2) return;
    const ingredient = await createIngredient.mutateAsync({ name });
    onSelectIngredient(ingredient);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!recipeName.trim() || ingredientIds.length === 0) return;

    if (editingId) {
      await updateRecipe.mutateAsync({ id: editingId, name: recipeName.trim(), ingredientIds });
    } else {
      await createRecipe.mutateAsync({ name: recipeName.trim(), ingredientIds });
    }

    setRecipeName("");
    setSelected([]);
    setEditingId(null);
    await utils.recipe.listRecipes.invalidate();
  };

  const onEditRecipe = (recipe: NonNullable<typeof recipes.data>[number]) => {
    setEditingId(recipe.id);
    setRecipeName(recipe.name);
    setSelected(recipe.items.map((item) => ({ id: item.ingredientId, name: item.ingredient.name })));
  };

  const onDeleteRecipe = async (id: string) => {
    await deleteRecipe.mutateAsync({ id });
    await utils.recipe.listRecipes.invalidate();
  };

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4 py-5">
      <PageHeader title="Recipe Builder" subtitle="Create recipes and preview their predicted impact." />

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-3xl border bg-card/85 p-5 shadow-[0_10px_30px_rgba(78,98,125,0.12)] backdrop-blur"
      >
        <label className="block text-sm">
          <span className="mb-1 block text-lg font-medium">Recipe name</span>
          <input
            className="w-full rounded-2xl border bg-background/80 px-4 py-3 text-lg outline-none ring-primary/30 focus:ring-2"
            placeholder="Example: Homemade Pasta"
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value)}
            required
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-lg font-medium">Search ingredients</span>
          <input
            className="w-full rounded-2xl border bg-background/80 px-4 py-3 text-lg outline-none ring-primary/30 focus:ring-2"
            placeholder="Type wheat, eggs, olive oil..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        {query.trim().length > 0 && (
          <div className="rounded-2xl border bg-background/80 p-2">
            <ul className="space-y-1">
              {(ingredientQuery.data ?? []).map((ingredient) => (
                <li key={ingredient.id}>
                  <button
                    type="button"
                    onClick={() => onSelectIngredient(ingredient)}
                    className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    {ingredient.name}
                  </button>
                </li>
              ))}
            </ul>
            {(ingredientQuery.data?.length ?? 0) === 0 && (
              <button
                type="button"
                onClick={onCreateCustomIngredient}
                className="mt-1 w-full rounded-xl bg-accent px-3 py-2 text-left text-sm text-accent-foreground"
              >
                Create custom ingredient: &quot;{query.trim()}&quot;
              </button>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {selected.map((ingredient) => (
            <button
              key={ingredient.id}
              type="button"
              className="rounded-full border bg-accent px-3 py-1 text-xs text-accent-foreground"
              onClick={() => setSelected((prev) => prev.filter((item) => item.id !== ingredient.id))}
            >
              {ingredient.name} ×
            </button>
          ))}
        </div>

        <div className="rounded-2xl border bg-card/90 p-4">
          <p className="text-sm text-muted-foreground">Predicted impact</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-2xl font-semibold">
              {prediction.data?.score !== null && prediction.data?.score !== undefined ? prediction.data.score : "--"}
            </span>
            <span className="text-sm text-muted-foreground">/ 10</span>
            <span className="ml-auto text-xs text-muted-foreground">
              {prediction.data ? `${prediction.data.knownCount}/${prediction.data.totalCount} ingredients known` : ""}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {prediction.data?.score === null
              ? "Not enough data yet. Keep logging to improve predictions."
              : "Lower is better. Predictions improve with more history."}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={createRecipe.isPending || updateRecipe.isPending || ingredientIds.length === 0}
            className="flex-1 rounded-full bg-[hsl(150_42%_59%)] px-4 py-3 text-lg font-semibold text-white disabled:opacity-60"
          >
            {editingId ? "Update Recipe" : "Save Recipe"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setRecipeName("");
                setSelected([]);
              }}
              className="rounded-full border px-4 py-3 text-sm font-semibold"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <section className="mt-6">
        <h2 className="text-2xl font-semibold">Saved recipes</h2>
        <ul className="mt-2 space-y-2">
          {(recipes.data ?? []).map((recipe) => (
            <li key={recipe.id} className="rounded-2xl border bg-card/85 p-4 shadow-[0_8px_20px_rgba(78,98,125,0.10)]">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{recipe.name}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onEditRecipe(recipe)}
                    className="rounded-full border px-3 py-1 text-xs font-semibold"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteRecipe(recipe.id)}
                    className="rounded-full border px-3 py-1 text-xs font-semibold"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {recipe.items.map((item) => item.ingredient.name).join(", ") || "No ingredients"}
              </p>
            </li>
          ))}
          {(recipes.data?.length ?? 0) === 0 ? (
            <li className="text-sm text-muted-foreground">No recipes yet. Create your first one above.</li>
          ) : null}
        </ul>
      </section>
    </main>
  );
}
