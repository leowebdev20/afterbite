"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (mode === "register") {
        const response = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password })
        });

        const payload = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? "Could not create account.");
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false
      });

      if (result?.error) {
        throw new Error("Invalid email or password.");
      }

      router.push("/");
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm rounded-[2rem] border bg-white/95 p-6 shadow-[0_15px_40px_rgba(69,83,118,0.18)]">
        <div className="mb-5">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">AfterBite</p>
          <h1 className="mt-2 text-3xl font-semibold">{mode === "signin" ? "Welcome back" : "Create account"}</h1>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          {mode === "register" ? (
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Name</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-2xl border bg-background/80 px-3 py-2.5"
                placeholder="Your name"
              />
            </label>
          ) : null}

          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border bg-background/80 px-3 py-2.5"
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border bg-background/80 px-3 py-2.5"
              placeholder="••••••••"
              minLength={6}
              required
            />
          </label>

          {error ? <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[linear-gradient(135deg,hsl(246_38%_61%),hsl(222_63%_59%))] px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "register" : "signin")}
          className="mt-4 w-full rounded-full border px-4 py-2.5 text-sm font-medium"
        >
          {mode === "signin" ? "Need an account? Register" : "Already have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}
