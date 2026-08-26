import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatarMoeda, formatarData } from "@/lib/format";

interface Pendencia {
  id: string;
  pacienteId: string;
  pacienteNome: string;
  dataHora: string;
  valor: number;
}

export function PendenciasList({ itens }: { itens: Pendencia[] }) {
  if (itens.length === 0) {
    return (
      <EmptyState
        icon={CircleCheck}
        title="Tudo em dia"
        description="Não há pendências financeiras no momento."
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {itens.map((p) => (
        <li key={p.id}>
          <Link
            href={`/pacientes/${p.pacienteId}`}
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3 first:pt-0 last:pb-0 hover:opacity-80"
          >
            <div>
              <p className="text-sm font-medium text-text-main">{p.pacienteNome}</p>
              <p className="text-xs text-text-secondary">desde {formatarData(p.dataHora)}</p>
            </div>
            <span className="text-sm font-semibold text-warning">{formatarMoeda(p.valor)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
