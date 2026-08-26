"use client";

import { useState, type FormEvent } from "react";
import { signInWithEmailAndPassword, updatePassword } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

export function TrocarSenhaForm({ login }: { login: string }) {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setSucesso(false);

    if (novaSenha.length < 6) {
      setErro("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (novaSenha !== confirmacao) {
      setErro("A confirmação não bate com a nova senha.");
      return;
    }

    setEnviando(true);
    try {
      const auth = getFirebaseAuth();
      // Entrar de novo com a senha atual serve pra confirmar que é mesmo o
      // dono da conta (não dá pra trocar senha só por já estar logado) e já
      // devolve uma credencial fresca, exigida pelo Firebase pra updatePassword.
      const cred = await signInWithEmailAndPassword(auth, login, senhaAtual);
      await updatePassword(cred.user, novaSenha);

      // Trocar a senha revoga os refresh tokens no Firebase — o cookie de
      // sessão atual (verificado com checkRevoked) ficaria inválido no
      // próximo request. Renovamos ele aqui com o token novo pra pessoa não
      // ser deslogada sem entender por quê.
      const idToken = await cred.user.getIdToken(true);
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      setSenhaAtual("");
      setNovaSenha("");
      setConfirmacao("");
      setSucesso(true);
    } catch (err: any) {
      if (err?.code === "auth/invalid-credential" || err?.code === "auth/wrong-password") {
        setErro("Senha atual incorreta.");
      } else if (err?.code === "auth/too-many-requests") {
        setErro("Muitas tentativas. Tente novamente em alguns minutos.");
      } else {
        setErro("Não foi possível trocar a senha. Tente novamente.");
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className="mb-1 block text-sm text-text-secondary">Senha atual</label>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={senhaAtual}
          onChange={(e) => setSenhaAtual(e.target.value)}
          className="w-full rounded-md border border-disabled bg-bg px-3 py-2 text-sm text-text-main"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-text-secondary">Nova senha</label>
        <input
          type="password"
          required
          autoComplete="new-password"
          value={novaSenha}
          onChange={(e) => setNovaSenha(e.target.value)}
          className="w-full rounded-md border border-disabled bg-bg px-3 py-2 text-sm text-text-main"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-text-secondary">Confirmar nova senha</label>
        <input
          type="password"
          required
          autoComplete="new-password"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          className="w-full rounded-md border border-disabled bg-bg px-3 py-2 text-sm text-text-main"
        />
      </div>

      {erro && <p className="text-sm text-red-600">{erro}</p>}
      {sucesso && <p className="text-sm text-success">Senha alterada com sucesso.</p>}

      <button
        type="submit"
        disabled={enviando}
        className="self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60"
      >
        {enviando ? "Salvando..." : "Trocar senha"}
      </button>
    </form>
  );
}
