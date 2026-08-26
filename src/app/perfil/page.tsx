import { redirect } from "next/navigation";
import { getCurrentUsuario } from "@/lib/auth/session";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { AppShell } from "@/components/AppShell";
import { TrocarSenhaForm } from "./TrocarSenhaForm";
import { TimbradoForm } from "./TimbradoForm";
import { AssinaturaForm } from "./AssinaturaForm";

const LABEL_PAPEL: Record<string, string> = {
  matheus: "Matheus (profissional)",
  vitoria: "Vitória (profissional)",
  admin: "Administrador",
};

export default async function PerfilPage() {
  const usuario = await getCurrentUsuario();
  if (!usuario) redirect("/login");

  return (
    <AppShell usuario={usuario}>
      <h1 className="mb-6 text-lg font-semibold text-text-main">Meu perfil</h1>

      <div className="flex max-w-lg flex-col gap-6">
        <div className="rounded-xl bg-card p-6 shadow-sm">
          <dl className="mb-6 grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-text-secondary">Nome</dt>
            <dd className="text-text-main">{usuario.nome}</dd>
            <dt className="text-text-secondary">Usuário</dt>
            <dd className="text-text-main">{usuario.login}</dd>
            <dt className="text-text-secondary">Perfil</dt>
            <dd className="text-text-main">{LABEL_PAPEL[usuario.papel]}</dd>
          </dl>

          <ThemeSwitcher uid={usuario.uid} />
        </div>

        <div className="rounded-xl bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-medium text-text-main">Trocar senha</h2>
          <TrocarSenhaForm login={usuario.login} />
        </div>

        {usuario.papel !== "admin" && (
          <div className="rounded-xl bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-medium text-text-main">Timbrado</h2>
            <TimbradoForm
              uid={usuario.uid}
              temTimbrado={Boolean(usuario.letterheadImagemUrl)}
              urlAtual={usuario.letterheadImagemUrl}
              atualizadoEm={usuario.letterheadAtualizadoEm}
            />
          </div>
        )}

        {usuario.papel !== "admin" && (
          <div className="rounded-xl bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-medium text-text-main">Assinatura</h2>
            <AssinaturaForm
              uid={usuario.uid}
              temAssinatura={Boolean(usuario.assinaturaImagemUrl)}
              urlAtual={usuario.assinaturaImagemUrl}
              atualizadoEm={usuario.assinaturaAtualizadaEm}
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}
