import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { KeyRound, UserCog, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveIndicator } from "@/lib/admin-ui";
import { adminCreatePanelUser, adminListPanelUsers, adminSetPanelUserActive, adminSetPanelUserPassword, adminSetPanelUserRole } from "@/lib/administration.functions";

export const Route = createFileRoute("/admin/administracao")({
  head: () => ({ meta: [
    { title: "Administração — NEXA CLOUD" },
    { name: "description", content: "Gerencie administradores, revendedores e usuários do painel NEXA CLOUD." },
    { property: "og:title", content: "Administração — NEXA CLOUD" },
    { property: "og:description", content: "Gerencie administradores, revendedores e usuários do painel NEXA CLOUD." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: Administration,
});

type Role = "admin" | "reseller" | "user";
type PanelUser = { id: string; email: string; role: Role; lastSignInAt: string | null; createdAt: string; active: boolean; isCurrent: boolean };
const inputClass = "h-10 min-w-0 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent";
const labels: Record<Role, string> = { admin: "Admin", reseller: "Revendedor", user: "Usuário" };

function Administration() {
  const queryClient = useQueryClient();
  const list = useServerFn(adminListPanelUsers);
  const create = useServerFn(adminCreatePanelUser);
  const setRole = useServerFn(adminSetPanelUserRole);
  const setPassword = useServerFn(adminSetPanelUserPassword);
  const setActive = useServerFn(adminSetPanelUserActive);
  const [email, setEmail] = useState("");
  const [password, setPasswordValue] = useState("");
  const [role, setRoleValue] = useState<Role>("admin");
  const [passwordUser, setPasswordUser] = useState<PanelUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const users = useQuery({ queryKey: ["admin-panel-users"], queryFn: () => list(), retry: false });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-panel-users"] });
  const run = async (action: () => Promise<unknown>, success: string) => {
    setError(null); setNotice(null); setBusy(true);
    try { await action(); await refresh(); setNotice(success); } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await run(async () => {
      await create({ data: { email, password, role } });
      setEmail(""); setPasswordValue(""); setRoleValue("admin");
    }, "Usuário criado com sucesso.");
  };
  const changeRole = (user: PanelUser, nextRole: Role) => run(() => setRole({ data: { id: user.id, role: nextRole } }), `Função de ${user.email} atualizada.`);
  const fmtDate = (value: string | null) => value ? new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "Nunca acessou";

  return (
    <div className="w-full space-y-7">
      <header className="border-b border-border pb-6"><LiveIndicator /><h1 className="text-3xl font-bold">Administração</h1><p className="mt-2 text-sm text-muted-foreground">Administradores, revendedores e usuários do painel.</p></header>
      {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {notice && <p role="status" className="rounded-md border border-accent/30 bg-accent/10 p-3 text-sm text-accent">{notice}</p>}

      <section className="rounded-md border border-border bg-card p-5 shadow-sm" aria-labelledby="create-user-title">
        <h2 id="create-user-title" className="mb-4 font-semibold">Criar acesso</h2>
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_160px_auto]">
          <input required type="email" aria-label="E-mail" placeholder="E-mail" className={inputClass} value={email} onChange={(event) => setEmail(event.target.value)} />
          <input required type="password" minLength={8} aria-label="Senha" placeholder="Senha (mínimo 8 caracteres)" className={inputClass} value={password} onChange={(event) => setPasswordValue(event.target.value)} />
          <select aria-label="Função" className={inputClass} value={role} onChange={(event) => setRoleValue(event.target.value as Role)}><option value="admin">Admin</option><option value="reseller">Revendedor</option><option value="user">Usuário</option></select>
          <Button disabled={busy} type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90"><UserPlus /> Criar</Button>
        </form>
      </section>

      <section className="space-y-3" aria-label="Usuários do painel">
        {users.isLoading && <p className="text-sm text-muted-foreground">Carregando usuários…</p>}
        {users.isError && <p className="text-sm text-destructive">Não foi possível carregar os usuários.</p>}
        {users.data?.map((user) => <article key={user.id} className={`rounded-md border bg-card p-5 shadow-sm ${user.active ? "border-border" : "border-destructive/30 opacity-75"}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><UserCog className="h-4 w-4 text-accent" /><h2 className="break-all font-semibold">{user.email}</h2><span className="rounded bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">{labels[user.role]}</span>{!user.active && <span className="rounded bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">Desativado</span>}{user.isCurrent && <span className="text-xs text-muted-foreground">Você</span>}</div><p className="mt-2 font-mono text-xs text-muted-foreground">Último acesso: {fmtDate(user.lastSignInAt)}</p></div>
            <div className="flex flex-wrap gap-2">
              {user.role !== "admin" && <Button size="sm" variant="outline" onClick={() => void changeRole(user, "admin")}>Tornar admin</Button>}
              {user.role === "admin" && <Button size="sm" variant="outline" disabled={user.isCurrent} onClick={() => void changeRole(user, "user")}>Tirar admin</Button>}
              {user.role !== "reseller" && <Button size="sm" variant="outline" disabled={user.isCurrent} onClick={() => void changeRole(user, "reseller")}>Tornar revendedor</Button>}
              {user.role === "reseller" && <Button size="sm" variant="outline" onClick={() => void changeRole(user, "user")}>Tirar revendedor</Button>}
              <Button size="sm" variant="outline" onClick={() => { setPasswordUser(user); setNewPassword(""); }}><KeyRound /> Senha</Button>
              <Button size="sm" variant="outline" disabled={user.isCurrent || busy} className={user.active ? "text-destructive" : ""} onClick={() => void run(() => setActive({ data: { id: user.id, active: !user.active } }), user.active ? `${user.email} foi desativado.` : `${user.email} foi reativado.`)}>{user.active ? "Desativar" : "Reativar"}</Button>
            </div>
          </div>
        </article>)}
      </section>

      {passwordUser && <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" onClick={() => setPasswordUser(null)}><div role="dialog" aria-modal="true" aria-label="Alterar senha" className="w-full max-w-md rounded-md bg-card p-6 shadow-xl" onClick={(event) => event.stopPropagation()}><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-semibold">Alterar senha</h2><p className="mt-1 break-all text-xs text-muted-foreground">{passwordUser.email}</p></div><Button size="icon" variant="ghost" aria-label="Fechar" onClick={() => setPasswordUser(null)}><X /></Button></div><form onSubmit={(event) => { event.preventDefault(); void run(async () => { await setPassword({ data: { id: passwordUser.id, password: newPassword } }); setPasswordUser(null); }, "Senha atualizada com sucesso."); }} className="space-y-3"><input autoFocus required type="password" minLength={8} aria-label="Nova senha" placeholder="Nova senha (mínimo 8 caracteres)" className={`w-full ${inputClass}`} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /><Button disabled={busy} type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Salvar nova senha</Button></form></div></div>}
    </div>
  );
}