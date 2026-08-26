"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { calcularIdade } from "@/lib/format";
import type { Paciente } from "@/lib/types";

export function ListaPacientes() {
  const [busca, setBusca] = useState("");
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setCarregando(true);
      fetch(`/api/pacientes?q=${encodeURIComponent(busca)}`)
        .then((r) => r.json())
        .then((data) => setPacientes(data.pacientes ?? []))
        .finally(() => setCarregando(false));
    }, 250);
    return () => clearTimeout(timeout);
  }, [busca]);

  return (
    <div>
      <input
        type="search"
        placeholder="Buscar paciente por nome..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="mb-4 w-full rounded-md border border-disabled bg-card px-3 py-2 text-sm text-text-main"
      />

      {carregando ? (
        <p className="text-sm text-text-secondary">Carregando...</p>
      ) : pacientes.length === 0 ? (
        <p className="text-sm text-text-secondary">Nenhum paciente encontrado.</p>
      ) : (
        <ul className="divide-y divide-support-soft rounded-xl bg-card shadow-sm">
          {pacientes.map((p) => (
            <li key={p.id}>
              <Link
                href={`/pacientes/${p.id}`}
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3 hover:bg-bg-secondary"
              >
                <div>
                  <p className="text-sm font-medium text-text-main">{p.nomeCompleto}</p>
                  <p className="text-xs text-text-secondary">
                    {calcularIdade(p.dataNascimento)} anos
                    {p.tipoHabitual && ` · ${p.tipoHabitual === "home_care" ? "Home Care" : "Clínica"}`}
                  </p>
                </div>
                <span className="text-primary">Ver ficha →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
