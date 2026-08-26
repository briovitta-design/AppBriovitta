"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

const MAX_TENTATIVAS = 5;
const BLOQUEIO_MS = 2 * 60 * 1000; // 2 minutos após exceder tentativas

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [bloqueadoAte, setBloqueadoAte] = useState<number | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);

    if (bloqueadoAte && Date.now() < bloqueadoAte) {
      const segundos = Math.ceil((bloqueadoAte - Date.now()) / 1000);
      setErro(`Muitas tentativas. Tente novamente em ${segundos}s.`);
      return;
    }

    setCarregando(true);
    try {
      const auth = getFirebaseAuth();
      const cred = await signInWithEmailAndPassword(auth, login, senha);
      const idToken = await cred.user.getIdToken();

      const resp = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!resp.ok) throw new Error("Sessão não criada");

      registrarTentativa(true);
      const redirectTo = params.get("redirect") || "/dashboard";
      router.push(redirectTo);
      router.refresh();
    } catch {
      const tentativas = registrarTentativa(false);
      if (tentativas >= MAX_TENTATIVAS) {
        const ate = Date.now() + BLOQUEIO_MS;
        setBloqueadoAte(ate);
        setErro("Muitas tentativas incorretas. Acesso bloqueado temporariamente.");
      } else {
        setErro("Login ou senha incorretos.");
      }
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-xl bg-card p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-text-main">Briovitta</h1>
        <p className="mb-6 text-sm text-text-secondary">
          Entre com seu usuário e senha.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm text-text-secondary">Usuário</label>
            <input
              type="email"
              required
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              className="w-full rounded-md border border-disabled bg-bg px-3 py-2 text-text-main"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-text-secondary">Senha</label>
            <input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full rounded-md border border-disabled bg-bg px-3 py-2 text-text-main"
              autoComplete="current-password"
            />
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <button
            type="submit"
            disabled={carregando}
            className="mt-2 rounded-md bg-primary px-4 py-2 font-medium text-white transition hover:bg-primary-hover disabled:opacity-60"
          >
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-xs text-text-secondary">
          Esqueceu a senha? Fale com o administrador do sistema — a
          recuperação de acesso é feita por ele (não há autocadastro).
        </p>
      </div>
    </div>
  );
}

// Guarda tentativas por login no localStorage do navegador — proteção
// básica no cliente. A proteção definitiva contra força bruta é do
// próprio Firebase Authentication, que já limita tentativas por conta/IP.
function registrarTentativa(sucesso: boolean): number {
  const chave = "briovitta_login_tentativas";
  if (sucesso) {
    localStorage.removeItem(chave);
    return 0;
  }
  const atual = Number(localStorage.getItem(chave) || "0") + 1;
  localStorage.setItem(chave, String(atual));
  return atual;
}
