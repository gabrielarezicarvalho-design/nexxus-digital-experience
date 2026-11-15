import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle, Panel } from "@/lib/admin-ui";
import { pageHead } from "@/lib/page-head";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { normalizeCouponCode } from "@/lib/coupons";

export const Route = createFileRoute("/admin/cupons")({ head: () => pageHead("Cupons", "Crie cupons de desconto para o checkout NEXA CLOUD."), component: Cupons });

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Cupons() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const [{ data, error }, { data: pays }] = await Promise.all([
        supabase.from("coupons").select("*").order("created_at", { ascending: false }),
        supabase.from("payments").select("coupon_code").eq("status", "approved").not("coupon_code", "is", null),
      ]);
      if (error) throw error;
      const uses: Record<string, number> = {};
      for (const p of pays ?? []) if (p.coupon_code) uses[p.coupon_code] = (uses[p.coupon_code] ?? 0) + 1;
      return (data ?? []).map(c => ({ ...c, uses: uses[c.code] ?? 0 }));
    },
  });
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"percent" | "amount">("percent");
  const [value, setValue] = useState("");
  const [expires, setExpires] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [err, setErr] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-coupons"] });

  const create = useMutation({
    mutationFn: async () => {
      const n = Number(value.replace(",", "."));
      if (!normalizeCouponCode(code) || !(n > 0)) throw new Error("Preencha o código e o desconto.");
      if (kind === "percent" && (n < 1 || n > 90)) throw new Error("O desconto em % deve ser entre 1 e 90.");
      const { error } = await supabase.from("coupons").insert({
        code: normalizeCouponCode(code),
        percent_off: kind === "percent" ? Math.round(n) : null,
        amount_off_cents: kind === "amount" ? Math.round(n * 100) : null,
        expires_at: expires ? new Date(`${expires}T23:59:59-03:00`).toISOString() : null,
        max_uses: maxUses ? Math.max(1, Math.round(Number(maxUses))) : null,
      });
      if (error) throw new Error(error.code === "23505" ? "Já existe um cupom com esse código." : error.message);
    },
    onSuccess: () => { setCode(""); setValue(""); setExpires(""); setMaxUses(""); setErr(""); void refresh(); },
    onError: (e: Error) => setErr(e.message),
  });
  const toggle = useMutation({ mutationFn: async (v: { id: string; active: boolean }) => { await supabase.from("coupons").update({ active: v.active }).eq("id", v.id); }, onSuccess: refresh });
  const remove = useMutation({ mutationFn: async (id: string) => { await supabase.from("coupons").delete().eq("id", id); }, onSuccess: refresh });

  return <>
    <PageTitle title="Cupons" />
    <Panel className="mb-6">
      <form className="grid gap-3 md:grid-cols-6 md:items-end" onSubmit={e => { e.preventDefault(); create.mutate(); }}>
        <label className="grid gap-1 text-sm md:col-span-2">Código<Input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="NEXA10" /></label>
        <label className="grid gap-1 text-sm">Tipo
          <select className="h-9 rounded-md border border-input bg-background px-2" value={kind} onChange={e => setKind(e.target.value as "percent" | "amount")}><option value="percent">% de desconto</option><option value="amount">R$ de desconto</option></select>
        </label>
        <label className="grid gap-1 text-sm">{kind === "percent" ? "Desconto (%)" : "Desconto (R$)"}<Input inputMode="decimal" value={value} onChange={e => setValue(e.target.value)} placeholder={kind === "percent" ? "10" : "20,00"} /></label>
        <label className="grid gap-1 text-sm">Válido até (opcional)<Input type="date" value={expires} onChange={e => setExpires(e.target.value)} /></label>
        <label className="grid gap-1 text-sm">Limite de usos (opcional)<Input inputMode="numeric" value={maxUses} onChange={e => setMaxUses(e.target.value.replace(/\D/g, ""))} placeholder="Ilimitado" /></label>
        <Button type="submit" className="md:col-span-6 md:justify-self-start" disabled={create.isPending}>{create.isPending ? "Criando…" : "Criar cupom"}</Button>
      </form>
      {err && <p role="alert" className="mt-3 text-sm text-destructive">{err}</p>}
    </Panel>
    <Panel>
      {list.isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : !list.data?.length ? <p className="text-sm text-muted-foreground">Nenhum cupom criado ainda.</p> :
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="text-left text-muted-foreground"><th className="py-2">Código</th><th>Desconto</th><th>Validade</th><th>Usos</th><th>Ativo</th><th /></tr></thead>
          <tbody>{list.data.map(c => <tr key={c.id} className="border-t border-border">
            <td className="py-2 font-semibold">{c.code}</td>
            <td>{c.percent_off ? `${c.percent_off}%` : brl(c.amount_off_cents ?? 0)}</td>
            <td>{c.expires_at ? new Date(c.expires_at).toLocaleDateString("pt-BR") : "Sem prazo"}</td>
            <td>{c.uses}{c.max_uses ? ` / ${c.max_uses}` : ""}</td>
            <td><Switch checked={c.active} onCheckedChange={active => toggle.mutate({ id: c.id, active })} className="data-[state=checked]:bg-accent" /></td>
            <td className="text-right"><Button variant="ghost" size="icon" aria-label={`Excluir ${c.code}`} onClick={() => { if (confirm(`Excluir o cupom ${c.code}?`)) remove.mutate(c.id); }}><Trash2 size={15} /></Button></td>
          </tr>)}</tbody>
        </table></div>}
    </Panel>
  </>;
}
