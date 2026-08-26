import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Users } from "lucide-react";
import { formatarMoeda } from "@/lib/format";

interface Resumo {
  uid: string;
  nome: string;
  faturadoMes: number;
  atendimentosMes: number;
}

export function ProfessionalSummary({ itens }: { itens: Resumo[] }) {
  if (itens.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Sem dados no período"
        description="Quando houver atendimentos registrados neste mês, o resumo por profissional aparece aqui."
      />
    );
  }

  const maior = Math.max(...itens.map((i) => i.faturadoMes), 1);

  return (
    <ul className="space-y-4">
      {itens.map((p) => (
        <li key={p.uid} className="flex items-center gap-3">
          <Avatar nome={p.nome} size="sm" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
              <span className="font-medium text-text-main">{p.nome}</span>
              <span className="text-text-secondary">{formatarMoeda(p.faturadoMes)}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-bg-secondary">
              <div
                className="h-full rounded-full bg-brand-gradient"
                style={{ width: `${(p.faturadoMes / maior) * 100}%` }}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
