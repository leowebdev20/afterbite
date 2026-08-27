import { AlertCircle, Loader2, Search } from "lucide-react";

type StatusMessageProps = {
  title: string;
  body?: string;
  tone?: "loading" | "empty" | "error";
};

export function StatusMessage({ title, body, tone = "empty" }: StatusMessageProps) {
  const Icon = tone === "loading" ? Loader2 : tone === "error" ? AlertCircle : Search;
  const toneClass =
    tone === "error"
      ? "border-[hsl(356_60%_82%)] bg-[hsl(356_70%_97%)] text-[hsl(356_62%_34%)]"
      : "border bg-white/92 text-foreground";

  return (
    <div className={`rounded-2xl px-3 py-3 text-sm shadow-sm ${toneClass}`}>
      <div className="flex items-start gap-2">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone === "loading" ? "animate-spin" : ""}`} />
        <div>
          <p className="font-semibold">{title}</p>
          {body ? <p className="mt-0.5 text-xs text-muted-foreground">{body}</p> : null}
        </div>
      </div>
    </div>
  );
}
