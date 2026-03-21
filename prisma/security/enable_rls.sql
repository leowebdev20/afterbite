-- Supabase hardening: enable RLS and deny direct PostgREST access by default.
-- This project currently uses server-side Prisma, so anon/authenticated access
-- should stay blocked until Auth.js + Supabase auth policies are introduced.

do $$
declare
  t text;
  tables text[] := array[
    'User',
    'UserSettings',
    'Ingredient',
    'Meal',
    'MealItem',
    'SymptomLog',
    'SymptomEntry',
    'Recipe',
    'RecipeItem',
    'IngredientImpactSnapshot'
  ];
begin
  foreach t in array tables loop
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = t
        and policyname = 'deny_anon'
    ) then
      execute format(
        'create policy deny_anon on public.%I for all to anon using (false) with check (false)',
        t
      );
    end if;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = t
        and policyname = 'deny_authenticated'
    ) then
      execute format(
        'create policy deny_authenticated on public.%I for all to authenticated using (false) with check (false)',
        t
      );
    end if;
  end loop;
end $$;
