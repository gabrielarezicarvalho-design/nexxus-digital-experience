import { useMemo } from "react";

export type FlowProvider = { name: string; active: boolean };
export type FlowActivity = { provider: string; calls: number; errors: number; lastAt: number };

const W = 1000;
const H = 460;
const CX = W / 2;
const CY = H / 2;
const RX = 410;
const RY = 175;

const initials = (name: string) => name.split(/[\s.]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";

/** Mapa ao vivo: o site no centro, os fornecedores em volta, e uma linha animada até quem está sendo chamado agora. */
export function ProviderFlowMap({ providers, activity, selected, onSelect }: {
  providers: FlowProvider[];
  activity: FlowActivity[];
  selected?: string;
  onSelect?: (name: string) => void;
}) {
  const nodes = useMemo(() => {
    const n = Math.max(providers.length, 1);
    return providers.map((p, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      return { ...p, x: CX + RX * Math.cos(angle), y: CY + RY * Math.sin(angle) };
    });
  }, [providers]);
  const byName = new Map(activity.map((a) => [a.provider, a]));
  const live = activity.filter((a) => a.calls > 0).length;
  const totalLive = activity.reduce((s, a) => s + a.calls, 0);

  return (
    <div className="relative w-full overflow-hidden rounded-md border border-border bg-[radial-gradient(circle_at_center,hsl(var(--accent)/0.06),transparent_70%)]" style={{ aspectRatio: `${W} / ${H}` }}>
      <style>{`
        @keyframes nexa-flow { to { stroke-dashoffset: -28; } }
        @keyframes nexa-pulse { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
        .nexa-flow { stroke-dasharray: 6 8; animation: nexa-flow .7s linear infinite; }
        .nexa-glow { animation: nexa-pulse 1.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .nexa-flow, .nexa-glow { animation: none; } }
      `}</style>
      {/* grade de fundo */}
      <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <pattern id="nexa-grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="currentColor" strokeOpacity="0.06" /></pattern>
          <linearGradient id="nexa-line-ok" x1="0" x2="1"><stop offset="0" stopColor="#2dd4bf" /><stop offset="1" stopColor="#a3e635" /></linearGradient>
          <linearGradient id="nexa-line-err" x1="0" x2="1"><stop offset="0" stopColor="#f97316" /><stop offset="1" stopColor="#ef4444" /></linearGradient>
        </defs>
        <rect width={W} height={H} fill="url(#nexa-grid)" className="text-foreground" />
        {nodes.map((node) => {
          const a = byName.get(node.name);
          const on = Boolean(a && a.calls > 0);
          const bad = Boolean(a && a.errors > 0 && a.errors >= a.calls);
          const mx = (node.x + CX) / 2 + (node.y - CY) * 0.25;
          const my = (node.y + CY) / 2 - (node.x - CX) * 0.08;
          const d = `M ${node.x} ${node.y} Q ${mx} ${my} ${CX} ${CY}`;
          return (
            <g key={node.name}>
              <path d={d} fill="none" stroke="currentColor" strokeOpacity={on ? 0 : 0.08} strokeWidth={1.5} className="text-foreground" />
              {on && <>
                <path d={d} fill="none" stroke={bad ? "url(#nexa-line-err)" : "url(#nexa-line-ok)"} strokeOpacity={0.25} strokeWidth={10} strokeLinecap="round" />
                <path d={d} fill="none" stroke={bad ? "url(#nexa-line-err)" : "url(#nexa-line-ok)"} strokeWidth={3.5} strokeLinecap="round" className="nexa-flow" />
              </>}
            </g>
          );
        })}
      </svg>

      {/* centro: o site */}
      <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: "50%", top: "50%" }}>
        <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold shadow-sm ${live ? "border-yellow-400/70 bg-yellow-100 text-yellow-900 shadow-[0_0_28px_rgba(250,204,21,0.55)] dark:bg-yellow-400/15 dark:text-yellow-200" : "border-border bg-card"}`}>
          <span className={`grid h-6 w-6 place-items-center rounded-md bg-accent text-[11px] font-bold text-accent-foreground ${live ? "nexa-glow" : ""}`}>N</span>
          Nexa Cloud
          {totalLive > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-yellow-400 px-1 text-[11px] font-bold text-yellow-950">{totalLive}</span>}
        </div>
      </div>

      {/* fornecedores em volta */}
      {nodes.map((node) => {
        const a = byName.get(node.name);
        const on = Boolean(a && a.calls > 0);
        const isSel = selected === node.name;
        return (
          <button key={node.name} type="button" onClick={() => onSelect?.(node.name)}
            className={`absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-md border px-2.5 py-1.5 text-xs font-medium shadow-sm transition ${isSel ? "border-accent ring-2 ring-accent/40" : on ? "border-teal-400/70" : "border-border"} ${node.active ? "bg-card" : "bg-muted/60 text-muted-foreground"}`}
            style={{ left: `${(node.x / W) * 100}%`, top: `${(node.y / H) * 100}%` }}
            title={a ? `${a.calls} chamada(s) no último minuto${a.errors ? ` · ${a.errors} com erro` : ""}` : node.active ? "Sem chamadas no último minuto" : "Fornecedor desativado"}>
            <span className={`grid h-5 w-5 place-items-center rounded bg-muted text-[9px] font-bold ${on ? "text-teal-600 dark:text-teal-300" : "text-muted-foreground"}`}>{initials(node.name)}</span>
            {node.name}
            {on && <span className="h-1.5 w-1.5 rounded-full bg-teal-500 nexa-glow" />}
            {!node.active && <span className="text-[10px]">· inativo</span>}
          </button>
        );
      })}
      {providers.length === 0 && <p className="absolute inset-x-0 bottom-3 text-center text-xs text-muted-foreground">Nenhum fornecedor cadastrado.</p>}
    </div>
  );
}
