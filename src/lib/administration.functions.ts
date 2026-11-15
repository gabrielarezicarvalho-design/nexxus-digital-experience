import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AdminContext = { supabase: any; userId: string; claims: any };
type AppRole = "admin" | "reseller" | "user";

async function assertAdmin(context: AdminContext) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || !data) throw new Error("Acesso negado");
}

async function adminClient(context: AdminContext) {
  await assertAdmin(context);
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

async function writeRole(db: Awaited<ReturnType<typeof adminClient>>, userId: string, role: AppRole) {
  const { error: deleteError } = await db.from("user_roles").delete().eq("user_id", userId);
  if (deleteError) throw new Error(deleteError.message);
  const { error: insertError } = await db.from("user_roles").insert({ user_id: userId, role });
  if (insertError) throw new Error(insertError.message);
}

async function audit(context: AdminContext, action: string, userId: string, details?: unknown) {
  await context.supabase.from("audit_logs").insert({
    actor_id: context.userId,
    actor_email: context.claims?.email ?? null,
    action,
    entity: "panel_user",
    entity_id: userId,
    details: details ?? null,
  });
}

export const adminListPanelUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminClient(context);
    const { data: usersData, error } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw new Error(error.message);
    const ids = usersData.users.map((user) => user.id);
    const roles = ids.length
      ? (await db.from("user_roles").select("user_id, role").in("user_id", ids)).data ?? []
      : [];
    const roleByUser = new Map(roles.map((row) => [row.user_id, row.role]));
    return usersData.users.map((user) => ({
      id: user.id,
      email: user.email ?? "Sem e-mail",
      role: (roleByUser.get(user.id) ?? "user") as AppRole,
      lastSignInAt: user.last_sign_in_at ?? null,
      createdAt: user.created_at,
      active: !user.banned_until || new Date(user.banned_until) <= new Date(),
      isCurrent: user.id === context.userId,
    }));
  });

export const adminCreatePanelUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    email: z.string().trim().email().max(255),
    password: z.string().min(8).max(100),
    role: z.enum(["admin", "reseller", "user"]),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const db = await adminClient(context);
    const { data: created, error } = await db.auth.admin.createUser({
      email: data.email.toLowerCase(),
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) throw new Error(error?.message ?? "Não foi possível criar o usuário");
    try {
      await writeRole(db, created.user.id, data.role);
    } catch (roleError) {
      await db.auth.admin.deleteUser(created.user.id);
      throw roleError;
    }
    await audit(context, "panel_user.create", created.user.id, { email: data.email.toLowerCase(), role: data.role });
    return { id: created.user.id };
  });

export const adminSetPanelUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid(), role: z.enum(["admin", "reseller", "user"]) }).parse(data))
  .handler(async ({ data, context }) => {
    const db = await adminClient(context);
    if (data.id === context.userId && data.role !== "admin") throw new Error("Você não pode remover sua própria função de administrador.");
    await writeRole(db, data.id, data.role);
    await audit(context, "panel_user.role", data.id, { role: data.role });
    return { ok: true };
  });

export const adminSetPanelUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid(), password: z.string().min(8).max(100) }).parse(data))
  .handler(async ({ data, context }) => {
    const db = await adminClient(context);
    const { error } = await db.auth.admin.updateUserById(data.id, { password: data.password });
    if (error) throw new Error(error.message);
    await audit(context, "panel_user.password", data.id);
    return { ok: true };
  });

export const adminSetPanelUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    const db = await adminClient(context);
    if (data.id === context.userId && !data.active) throw new Error("Você não pode desativar seu próprio acesso.");
    const { error } = await db.auth.admin.updateUserById(data.id, { ban_duration: data.active ? "none" : "876000h" });
    if (error) throw new Error(error.message);
    await audit(context, data.active ? "panel_user.activate" : "panel_user.deactivate", data.id);
    return { ok: true };
  });