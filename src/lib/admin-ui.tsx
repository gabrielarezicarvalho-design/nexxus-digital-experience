import type { ReactNode } from "react";

export const fmt = (n: number | null | undefined) => (n == null ? "∞" : new Intl.NumberFormat("pt-BR").format(n));
export const fmtDate = (s: string | null | undefined) => (s ? new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—");

export function LiveIndicator() {
  return (
    <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-accent">
      <span className="relative flex h-2 w-2" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-40 motion-reduce:animate-none" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
      </span>
      Operação em tempo real
    </p>
  );
}

export function PageTitle({ title, description, children }: { title: string; description?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-6">
      <div>
        <LiveIndicator />
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="mt-2 max-w-prose text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

const TONES: Record<string, string> = {
  active: "bg-accent/15 text-accent",
  blocked: "bg-destructive/15 text-destructive",
  revoked: "bg-muted text-muted-foreground",
  expired: "bg-muted text-muted-foreground",
  exhausted: "bg-destructive/15 text-destructive",
};
const LABELS: Record<string, string> = { active: "Ativo", blocked: "Bloqueado", revoked: "Revogada", expired: "Expirada", exhausted: "Sem tokens" };

export function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${TONES[status] ?? "bg-muted"}`}>{LABELS[status] ?? status}</span>;
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-border bg-card p-5 ${className}`}>{children}</div>;
}
