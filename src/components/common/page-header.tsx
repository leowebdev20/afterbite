"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
};

export function PageHeader({ title, subtitle, showBack = true }: PageHeaderProps) {
  const router = useRouter();

  return (
    <header className="mb-4">
      <div className="flex items-center gap-2">
        {showBack && (
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border bg-card/70 text-foreground"
            aria-label="Go back"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      </div>
      {subtitle ? <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p> : null}
      <Link href="/" className="mt-2 inline-block text-xs text-muted-foreground underline-offset-2 hover:underline">
        Home
      </Link>
    </header>
  );
}
