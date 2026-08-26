import { redirect } from "next/navigation";
import { getCurrentUsuario } from "@/lib/auth/session";

export default async function HomePage() {
  const usuario = await getCurrentUsuario();
  redirect(usuario ? "/dashboard" : "/login");
}
