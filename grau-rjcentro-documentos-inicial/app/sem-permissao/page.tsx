import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Brand } from "@/components/Brand";
import { SairButton } from "@/components/SairButton";

export default function SemPermissao(){
  return <div className="login-page"><div className="login-card denied-card">
    <div className="login-colors"><span/><span/><span/><span/><span/><span/></div>
    <div className="login-brand"><Brand/></div>
    <ShieldAlert size={32} className="denied-icon" />
    <h1>Acesso não autorizado</h1>
    <p>O usuário não possui um perfil institucional ativo. Entre em contato com o Administrador Principal.</p>
    <SairButton classe="btn btn-primary login-submit" />
    <Link className="denied-link" href="/login">Voltar ao login</Link>
  </div></div>;
}
