"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/Brand";
import { createClient } from "@/lib/supabase/client";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function entrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (carregando) return;
    setErro("");
    setCarregando(true);
    try {
      const supabase = createClient();
      const { data: auth, error: erroLogin } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
      if (erroLogin || !auth.user) {
        setErro("Não foi possível entrar. Confira o e-mail e a senha.");
        return;
      }
      // A conta do Supabase Auth só pode entrar se estiver ativa na instituição.
      const { data: perfil, error: erroPerfil } = await supabase
        .from("usuarios_sistema")
        .select("perfil, ativo")
        .eq("usuario_id", auth.user.id)
        .maybeSingle();
      if (erroPerfil || !perfil?.ativo || !["ADMINISTRADOR", "COORDENACAO_PEDAGOGICA", "INSPECAO_ESCOLAR"].includes(perfil.perfil)) {
        await supabase.auth.signOut();
        setErro("Sua conta não está habilitada para este sistema. Solicite acesso à administração.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setErro("Falha na conexão com o servidor. Tente novamente.");
    } finally { setCarregando(false); }
  }

  return <div className="login-page">
    <div className="login-card">
      <div className="login-colors"><span/><span/><span/><span/><span/><span/></div>
      <div className="login-brand"><Brand /></div>
      <div className="login-heading">
        <span className="login-kicker"><ShieldCheck size={15}/> ACESSO INSTITUCIONAL</span>
        <h1>Sistema Documental</h1>
        <p>Entre com suas credenciais autorizadas para acessar a gestão documental da unidade.</p>
      </div>
      <form onSubmit={entrar} className="login-form">
        <label htmlFor="email">E-mail</label>
        <div className="login-field"><Mail size={18}/><input id="email" type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seuemail@exemplo.com" required /></div>
        <label htmlFor="senha">Senha</label>
        <div className="login-field"><LockKeyhole size={18}/><input id="senha" type={mostrar?"text":"password"} autoComplete="current-password" value={senha} onChange={e=>setSenha(e.target.value)} placeholder="Digite sua senha" required /><button type="button" aria-label={mostrar?"Ocultar senha":"Mostrar senha"} onClick={()=>setMostrar(v=>!v)}>{mostrar?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>
        {erro && <p className="login-error" role="alert">{erro}</p>}
        <button className="btn btn-primary login-submit" type="submit" disabled={carregando}>{carregando?"Autenticando...":"Entrar"}</button>
      </form>
      <p className="login-footer">Grau Técnico • Rio de Janeiro Centro<br/>Acesso restrito a profissionais autorizados</p>
    </div>
  </div>;
}
