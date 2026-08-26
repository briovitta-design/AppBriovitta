import { redirect } from "next/navigation";
import { getCurrentUsuario } from "@/lib/auth/session";
import { getAdminDb } from "@/lib/firebase/admin";
import type { Usuario } from "@/lib/types";
import { NovoUsuarioForm } from "./NovoUsuarioForm";
import { BotaoBackup } from "./BotaoBackup";
import { AppShell } from "@/components/AppShell";

export default async function AdminUsuariosPage() {
  const usuario = await getCurrentUsuario();
  if (!usuario) redirect("/login");
  if (usuario.papel !== "admin") redirect("/dashboard");

  const snap = await getAdminDb().collection("usuarios").orderBy("nome").get();
  const usuarios = snap.docs.map((d) => d.data() as Usuario);

  return (
    <AppShell usuario={usuario}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-text-main">Administração de usuários</h1>
        <BotaoBackup />
      </div>

      <div className="mb-8 rounded-xl bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-medium text-text-main">Criar usuário</h2>
        <NovoUsuarioForm />
      </div>

      <div className="rounded-xl bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-medium text-text-main">
          Usuários cadastrados
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="text-text-secondary">
                <th className="pb-2">Nome</th>
                <th className="pb-2">Usuário</th>
                <th className="pb-2">Perfil</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.uid} className="border-t border-support-soft">
                  <td className="py-2 text-text-main">{u.nome}</td>
                  <td className="py-2 text-text-main">{u.login}</td>
                  <td className="py-2 text-text-main">{u.papel}</td>
                  <td className="py-2">
                    <span
                      className={u.ativo ? "text-success" : "text-text-secondary"}
                    >
                      {u.ativo ? "Ativo" : "Desativado"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
