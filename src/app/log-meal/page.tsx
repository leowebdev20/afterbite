"use client";

import { FormEvent, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { api } from "@/trpc/client";

const MEAL_TYPES = ["BREAKFAST", "LUNCH", "DINNER", "SNACK", "OTHER"] as const;
type MealType = (typeof MEAL_TYPES)[number];

type SelectedIngredient = {
  id: string;
  name: string;
  quantity: string;
};

const HISTORY_PRESETS = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "all", label: "All" }
] as const;
type HistoryPreset = (typeof HISTORY_PRESETS)[number]["id"];

function formatMealType(value: MealType) {
  return value[0] + value.slice(1).toLowerCase();
}

function toDateTimeLocalValue(date: Date) {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 16);
}

function fromDateTimeLocalValue(value: string) {
  return value ? new Date(value) : new Date();
}

export default function LogMealPage() {
  const utils = api.useUtils();
  const [historyPreset, setHistoryPreset] = useState<HistoryPreset>("today");
  const [mealName, setMealName] = useState("");
  const [mealType, setMealType] = useState<MealType>("OTHER");
  const [mealDateTime, setMealDateTime] = useState(() => toDateTimeLocalValue(new Date()));
  const [query, setQuery] = useState("");
  const [saveAsRecipe, setSaveAsRecipe] = useState(false);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedIngredient[]>([]);

  const historyRange = useMemo(() => {
    if (historyPreset === "all") return undefined;
    const now = new Date();
    if (historyPreset === "today") {
      const from = new Date();
      from.setHours(0, 0, 0, 0);
      return { from };
    }
    const days = historyPreset === "7d" ? 7 : 30;
    const from = new Date(now);
    from.setDate(from.getDate() - (days - 1));
    from.setHours(0, 0, 0, 0);
    return { from };
  }, [historyPreset]);

  const ingredientQuery = api.meal.searchIngredients.useQuery(
    { query: query.trim() || "a" },
    { enabled: query.trim().length > 0 }
  );
  const meals = api.meal.listMeals.useQuery(historyRange);
  const createIngredient = api.meal.createIngredient.useMutation();
  const addMeal = api.meal.quickAddMeal.useMutation();
  const updateMeal = api.meal.updateMeal.useMutation();
  const deleteMeal = api.meal.deleteMeal.useMutation();
  const createRecipe = api.recipe.createRecipe.useMutation();

  const selectedIds = useMemo(() => new Set(selected.map((item) => item.id)), [selected]);

  const onSelectIngredient = (ingredient: { id: string; name: string }) => {
    setSelected((prev) =>
      prev.some((item) => item.id === ingredient.id)
        ? prev
        : [...prev, { id: ingredient.id, name: ingredient.name, quantity: "" }]
    );
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
    const payload = {
      name: mealName.trim(),
      mealType,
      eatenAt: fromDateTimeLocalValue(mealDateTime),
      items: selected.map((item) => ({
        ingredientId: item.id,
        quantity: item.quantity.trim().length > 0 ? Number(item.quantity) : null
      }))
    };

    if (editingMealId) {
      await updateMeal.mutateAsync({ id: editingMealId, ...payload });
    } else {
      await addMeal.mutateAsync(payload);
    }

    if (!editingMealId && saveAsRecipe) {
      await createRecipe.mutateAsync({ name: mealName.trim(), ingredientIds });
    }

    setEditingMealId(null);
    setMealName("");
    setMealType("OTHER");
    setMealDateTime(toDateTimeLocalValue(new Date()));
    setQuery("");
    setSelected([]);
    setSaveAsRecipe(false);
    await Promise.all([
      utils.meal.listMeals.invalidate(),
      utils.meal.listTodayMeals.invalidate(),
      utils.forecast.getDailyImpactScore.invalidate(),
      utils.forecast.getTomorrowPrediction.invalidate()
    ]);
  };

  const onEditMeal = (meal: NonNullable<typeof meals.data>[number]) => {
    setEditingMealId(meal.id);
    setMealName(meal.name);
    setMealType(meal.mealType as MealType);
    setMealDateTime(toDateTimeLocalValue(new Date(meal.eatenAt)));
    setSelected(
      meal.items.map((item) => ({
        id: item.ingredientId,
        name: item.ingredient.name,
        quantity: item.quantity !== null ? String(item.quantity) : ""
      }))
    );
    setSaveAsRecipe(false);
  };

  const onDeleteMeal = async (mealId: string) => {
    const confirmed = window.confirm("Delete this meal?");
    if (!confirmed) return;
    await deleteMeal.mutateAsync({ id: mealId });
    if (editingMealId === mealId) {
      setEditingMealId(null);
      setMealName("");
      setMealType("OTHER");
      setMealDateTime(toDateTimeLocalValue(new Date()));
      setSelected([]);
    }
    await Promise.all([utils.meal.listMeals.invalidate(), utils.meal.listTodayMeals.invalidate()]);
  };

  return (
    <main className="min-h-dvh px-2 py-3">
      <PageHeader title="Log Meal" subtitle="Add a meal quickly with ingredients, meal type, and optional portions." />

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-[2rem] border bg-white/95 p-5 shadow-[0_10px_30px_rgba(75,94,140,0.16)]"
      >
        <label className="block text-sm">
          <span className="mb-1 block text-lg font-medium">Meal name</span>
          <input
            className="w-full rounded-2xl border bg-background/85 px-4 py-3 text-base outline-none ring-primary/30 focus:ring-2"
            placeholder="Example: Pizza"
            value={mealName}
            onChange={(e) => setMealName(e.target.value)}
            required
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-lg font-medium">Meal type</span>
          <select
            value={mealType}
            onChange={(event) => setMealType(event.target.value as MealType)}
            className="w-full rounded-2xl border bg-background/85 px-4 py-3 text-base outline-none ring-primary/30 focus:ring-2"
          >
            {MEAL_TYPES.map((type) => (
              <option key={type} value={type}>
                {formatMealType(type)}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-lg font-medium">Date and time eaten</span>
          <input
            type="datetime-local"
            className="w-full rounded-2xl border bg-background/85 px-4 py-3 text-base outline-none ring-primary/30 focus:ring-2"
            value={mealDateTime}
            onChange={(event) => setMealDateTime(event.target.value)}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-lg font-medium">Search ingredient</span>
          <input
            className="w-full rounded-2xl border bg-background/85 px-4 py-3 text-base outline-none ring-primary/30 focus:ring-2"
            placeholder="Type wheat, tomato, eggs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        {query.trim().length > 0 && (
          <div className="rounded-2xl border bg-background/80 p-2 shadow-sm">
            <ul className="space-y-1">
              {(ingredientQuery.data ?? []).map((ingredient) => (
                <li key={ingredient.id}>
                  <button
                    type="button"
                    onClick={() => onSelectIngredient(ingredient)}
                    className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-accent/70"
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
                className="mt-1 w-full rounded-xl bg-accent px-3 py-2 text-left text-sm font-medium text-accent-foreground"
              >
                Create custom ingredient: &quot;{query.trim()}&quot;
              </button>
            )}
          </div>
        )}

        <div className="space-y-2">
          {selected.map((ingredient) => (
            <div
              key={ingredient.id}
              className="grid grid-cols-[1fr_112px_auto] items-center gap-2 rounded-2xl border bg-white/92 px-3 py-2"
            >
              <p className="truncate text-sm font-medium">{ingredient.name}</p>
              <input
                type="number"
                min={0}
                step="0.1"
                placeholder="Portion"
                value={ingredient.quantity}
                onChange={(event) =>
                  setSelected((prev) =>
                    prev.map((item) =>
                      item.id === ingredient.id ? { ...item, quantity: event.target.value } : item
                    )
                  )
                }
                className="w-full rounded-xl border bg-background/85 px-2 py-1 text-sm"
              />
              <button
                type="button"
                className="rounded-full border bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground"
                onClick={() => setSelected((prev) => prev.filter((item) => item.id !== ingredient.id))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={saveAsRecipe}
            onChange={(e) => setSaveAsRecipe(e.target.checked)}
            disabled={Boolean(editingMealId)}
            className="h-4 w-4 accent-primary"
          />
          Save this meal as a recipe
        </label>

        <button
          type="submit"
          disabled={
            addMeal.isPending ||
            updateMeal.isPending ||
            selectedIds.size === 0 ||
            mealName.trim().length === 0
          }
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,hsl(246_38%_61%),hsl(222_63%_59%))] px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          {addMeal.isPending || updateMeal.isPending ? "Saving..." : editingMealId ? "Update Meal" : "Log Meal"}
        </button>
        {editingMealId ? (
          <button
            type="button"
            onClick={() => {
              setEditingMealId(null);
              setMealName("");
              setMealType("OTHER");
              setMealDateTime(toDateTimeLocalValue(new Date()));
              setSelected([]);
              setSaveAsRecipe(false);
            }}
            className="w-full rounded-full border px-4 py-3 text-sm font-semibold"
          >
            Cancel editing
          </button>
        ) : null}
      </form>

      <section className="mt-4 rounded-[2rem] border bg-white/95 p-4 shadow-[0_10px_30px_rgba(75,94,140,0.16)]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Meal History</h2>
          <div className="flex flex-wrap gap-1">
            {HISTORY_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setHistoryPreset(preset.id)}
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  historyPreset === preset.id
                    ? "bg-[hsl(243_44%_92%)] text-[hsl(243_35%_35%)]"
                    : "bg-white/92 text-muted-foreground"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        <ul className="mt-3 space-y-2">
          {meals.isLoading ? (
            <li className="text-sm text-muted-foreground">Loading meals...</li>
          ) : null}
          {meals.error ? (
            <li className="rounded-2xl border bg-white/92 p-3 text-sm text-[hsl(356_62%_40%)]">
              Could not load meals right now.
            </li>
          ) : null}
          {(meals.data ?? []).map((meal) => (
            <li key={meal.id} className="rounded-2xl border bg-white/92 p-4 shadow-[0_8px_20px_rgba(78,98,125,0.10)]">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-base font-semibold">{meal.name}</p>
                  <p className="text-xs text-muted-foreground">{formatMealType(meal.mealType as MealType)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    {new Date(meal.eatenAt).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => onEditMeal(meal)}
                      className="rounded-full border px-3 py-1 text-xs font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteMeal(meal.id)}
                      className="rounded-full border px-3 py-1 text-xs font-semibold"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {meal.items
                  .map((item) =>
                    item.quantity !== null ? `${item.ingredient.name} (${item.quantity})` : item.ingredient.name
                  )
                  .join(", ") || "No ingredients"}
              </p>
            </li>
          ))}
          {!meals.isLoading && !meals.error && (meals.data?.length ?? 0) === 0 ? (
            <li className="text-sm text-muted-foreground">No meals in this period yet.</li>
          ) : null}
        </ul>
      </section>
    </main>
  );
}
