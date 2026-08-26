import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Link de "voltar" para telas de detalhe/formulário que não ficam no menu
 * lateral (ficha do paciente, documento, novo documento etc.) — sem ele o
 * único jeito de sair era pelo botão "voltar" do navegador.
 */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-main"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}
