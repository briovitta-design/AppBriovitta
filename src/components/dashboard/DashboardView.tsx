"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Users, CalendarCheck, Wallet, Clock3, Receipt } from "lucide-react";
import { formatarMoeda } from "@/lib/format";
import { fetchJson } from "@/lib/fetch-json";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { KpiCard, KpiCardSkeleton } from "./KpiCard";
import { RevenueChart } from "./RevenueChart";
import { LocationDistribution } from "./LocationDistribution";
import { RecentAtendimentos } from "./RecentAtendimentos";
import { PendenciasList } from "./PendenciasList";
import { ProfessionalSummary } from "./ProfessionalSummary";

interface DadosDashboard {
  totalPacientes: number;
  atendimentosMes: number;
  faturadoMes: number;
  recebidoMes: number;
  pendenteMes: number;
  ticketMedio: number;
  distribuicaoLocal: { clinica: number; homeCare: number };
  serieFaturamento: { mes: string; faturado: number; recebido: number }[];
  atendimentosRecentes: Parameters<typeof RecentAtendimentos>[0]["itens"];
  pendenciasRecentes: Parameters<typeof PendenciasList>[0]["itens"];
  resumoPorProfissional: Parameters<typeof ProfessionalSummary>[0]["itens"];
  visaoAtual: "pessoal" | "clinica";
}

export function DashboardView({ ehAdmin }: { ehAdmin: boolean }) {
  const [visao, setVisao] = useState<"pessoal" | "clinica">(ehAdmin ? "clinica" : "pessoal");
  const [dados, setDados] = useState<DadosDashboard | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  function carregar() {
    setCarregando(true);
    setErro(null);
    fetchJson<DadosDashboard>(`/api/dashboard?visao=${visao}`)
      .then(setDados)
      .catch((e: Error) => setErro(e.message))
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visao]);

  return (
    <div className="space-y-6">
      {!ehAdmin && (
        <div className="inline-flex rounded-lg border border-border bg-card p-1 text-sm shadow-card">
          {(
            [
              { valor: "pessoal", label: "Minha visão" },
              { valor: "clinica", label: "Visão da clínica" },
            ] as const
          ).map((opcao) => (
            <button
              key={opcao.valor}
              onClick={() => setVisao(opcao.valor)}
              className={`rounded-md px-3.5 py-1.5 font-medium transition-colors ${
                visao === opcao.valor
                  ? "bg-primary text-text-on-primary"
                  : "text-text-secondary hover:text-text-main"
              }`}
            >
              {opcao.label}
            </button>
          ))}
        </div>
      )}

      {erro ? (
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-danger-soft text-danger">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display font-medium text-text-main">Não foi possível carregar o dashboard</p>
            <p className="mt-1 max-w-md text-sm text-text-secondary">{erro}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={carregar}>
            Tentar novamente
          </Button>
        </Card>
      ) : carregando || !dados ? (
        <DashboardSkeleton mostrarResumo={ehAdmin || visao === "clinica"} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <KpiCard label="Pacientes" value={String(dados.totalPacientes)} icon={Users} />
            <KpiCard
              label="Atendimentos (mês)"
              value={String(dados.atendimentosMes)}
              icon={CalendarCheck}
            />
            <KpiCard label="Faturado (mês)" value={formatarMoeda(dados.faturadoMes)} icon={Wallet} />
            <KpiCard
              label="Recebido (mês)"
              value={formatarMoeda(dados.recebidoMes)}
              icon={Wallet}
              tone="success"
            />
            <KpiCard
              label="Pendente (mês)"
              value={formatarMoeda(dados.pendenteMes)}
              icon={Clock3}
              tone={dados.pendenteMes > 0 ? "warning" : "default"}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <div>
                  <CardTitle>Faturamento x Recebido</CardTitle>
                  <p className="text-sm text-text-secondary">Últimos 6 meses</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-text-secondary">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-primary" /> Faturado
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-success" /> Recebido
                  </span>
                </div>
              </CardHeader>
              <RevenueChart dados={dados.serieFaturamento} />
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Clínica x Home Care</CardTitle>
              </CardHeader>
              <LocationDistribution
                clinica={dados.distribuicaoLocal.clinica}
                homeCare={dados.distribuicaoLocal.homeCare}
              />
              <div className="mt-6 flex items-center gap-3 rounded-xl bg-bg-secondary p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-card text-primary shadow-sm">
                  <Receipt className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-display text-sm font-semibold text-text-main">
                    {formatarMoeda(dados.ticketMedio)}
                  </p>
                  <p className="text-xs text-text-secondary">Ticket médio (mês)</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Atendimentos recentes</CardTitle>
              </CardHeader>
              <RecentAtendimentos itens={dados.atendimentosRecentes} />
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pendências financeiras</CardTitle>
              </CardHeader>
              <PendenciasList itens={dados.pendenciasRecentes} />
            </Card>
          </div>

          {(ehAdmin || visao === "clinica") && (
            <Card>
              <CardHeader>
                <CardTitle>Resumo por profissional (mês)</CardTitle>
              </CardHeader>
              <ProfessionalSummary itens={dados.resumoPorProfissional} />
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function DashboardSkeleton({ mostrarResumo }: { mostrarResumo: boolean }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <Skeleton className="h-64 w-full" />
        </Card>
        <Card>
          <Skeleton className="h-64 w-full" />
        </Card>
      </div>
      {mostrarResumo && (
        <Card>
          <Skeleton className="h-40 w-full" />
        </Card>
      )}
    </div>
  );
}
