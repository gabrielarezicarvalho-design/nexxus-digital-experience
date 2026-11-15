import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/keys")({
  beforeLoad: () => { throw redirect({ to: "/admin/clientes" }); },
});