"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { fetchJson } from "@/lib/fetch-json";

export function NovoUsuarioForm() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [login, setLogin] = useState("");
  const [senhaTemporaria, setSenhaTemporaria] = useState("");
  const [papel, setPapel] = useState("matheus");
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setMensagem(null);

    try {
      await fetchJson("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, login, senhaTemporaria, papel }),
      });

      setNome("");
      setLogin("");
      setSenhaTemporaria("");
      setMensagem("Usuário criado com sucesso.");
      router.refresh();
    } catch (err) {
      setMensagem(err instanceof Error ? err.message : "Erro ao criar usuário");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="mb-1 block text-sm text-text-secondary">Nome</label>
        <input
          required
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="w-full rounded-md border border-disabled bg-bg px-3 py-2 text-sm text-text-main"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-text-secondary">
          Usuário (e-mail)
        </label>
        <input
          type="email"
          required
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          className="w-full rounded-md border border-disabled bg-bg px-3 py-2 text-sm text-text-main"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-text-secondary">
          Senha temporária
        </label>
        <input
          type="text"
          required
          minLength={8}
          value={senhaTemporaria}
          onChange={(e) => setSenhaTemporaria(e.target.value)}
          className="w-full rounded-md border border-disabled bg-bg px-3 py-2 text-sm text-text-main"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-text-secondary">Perfil</label>
        <select
          value={papel}
          onChange={(e) => setPapel(e.target.value)}
          className="w-full rounded-md border border-disabled bg-bg px-3 py-2 text-sm text-text-main"
        >
          <option value="matheus">Matheus</option>
          <option value="vitoria">Vitória</option>
          <option value="admin">Administrador</option>
        </select>
      </div>

      <div className="sm:col-span-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60"
        >
          {enviando ? "Criando..." : "Criar usuário"}
        </button>
        {mensagem && <span className="text-sm text-text-secondary">{mensagem}</span>}
      </div>
    </form>
  );
}
