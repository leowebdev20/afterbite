"use client";

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
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border bg-card/80 text-foreground shadow-sm"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
      </div>
      {subtitle ? <p className="mt-3 max-w-sm text-lg leading-7 text-muted-foreground">{subtitle}</p> : null}
    </header>
  );
}
