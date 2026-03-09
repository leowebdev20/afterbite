"use client";

import { FormEvent, useMemo, useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { api } from "@/trpc/client";

export default function LogMealPage() {
  const utils = api.useUtils();
  const [mealName, setMealName] = useState("");
  const [query, setQuery] = useState("");
  const [saveAsRecipe, setSaveAsRecipe] = useState(false);
  const [selected, setSelected] = useState<Array<{ id: string; name: string }>>([]);

  const ingredientQuery = api.meal.searchIngredients.useQuery(
    { query: query.trim() || "a" },
    { enabled: query.trim().length > 0 }
  );
  const todayMeals = api.meal.listTodayMeals.useQuery();
  const createIngredient = api.meal.createIngredient.useMutation();
  const addMeal = api.meal.quickAddMeal.useMutation();
  const createRecipe = api.recipe.createRecipe.useMutation();

  const selectedIds = useMemo(() => new Set(selected.map((item) => item.id)), [selected]);

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
    if (!mealName.trim() || selected.length === 0) return;

    const ingredientIds = selected.map((item) => item.id);
    await addMeal.mutateAsync({ name: mealName.trim(), ingredientIds });

    if (saveAsRecipe) {
      await createRecipe.mutateAsync({ name: mealName.trim(), ingredientIds });
    }

    setMealName("");
    setQuery("");
    setSelected([]);
    setSaveAsRecipe(false);
    await utils.meal.listTodayMeals.invalidate();
  };

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4 py-5">
      <PageHeader title="Log Meal" subtitle="Add a meal quickly with ingredients or custom entries." />

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-3xl border bg-card/85 p-5 shadow-[0_10px_30px_rgba(78,98,125,0.12)] backdrop-blur"
      >
        <label className="block text-sm">
          <span className="mb-1 block text-lg font-medium">Meal name</span>
          <input
            className="w-full rounded-2xl border bg-background/80 px-4 py-3 text-lg outline-none ring-primary/30 focus:ring-2"
            placeholder="Example: Pizza"
            value={mealName}
            onChange={(e) => setMealName(e.target.value)}
            required
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-lg font-medium">Search ingredient</span>
          <input
            className="w-full rounded-2xl border bg-background/80 px-4 py-3 text-lg outline-none ring-primary/30 focus:ring-2"
            placeholder="Type wheat, tomato, eggs..."
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

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={saveAsRecipe}
            onChange={(e) => setSaveAsRecipe(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Save this meal as a recipe
        </label>

        <button
          type="submit"
          disabled={addMeal.isPending || selectedIds.size === 0 || mealName.trim().length === 0}
          className="w-full rounded-full bg-[hsl(150_42%_59%)] px-4 py-3 text-lg font-semibold text-white disabled:opacity-60"
        >
          {addMeal.isPending ? "Saving..." : "Save Meal"}
        </button>
      </form>

      <section className="mt-6">
        <h2 className="text-4xl font-semibold tracking-tight">Today&apos;s Meals</h2>
        <ul className="mt-2 space-y-2">
          {(todayMeals.data ?? []).map((meal) => (
            <li key={meal.id} className="rounded-2xl border bg-card/85 p-4 shadow-[0_8px_20px_rgba(78,98,125,0.10)]">
              <div className="flex items-center justify-between">
                <p className="text-4xl font-semibold tracking-tight">{meal.name}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(meal.eatenAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
              <p className="mt-1 text-lg text-muted-foreground">
                {meal.items.map((item) => item.ingredient.name).join(", ") || "No ingredients"}
              </p>
            </li>
          ))}
          {(todayMeals.data?.length ?? 0) === 0 && (
            <li className="text-sm text-muted-foreground">No meals logged today.</li>
          )}
        </ul>
      </section>
    </main>
  );
}
