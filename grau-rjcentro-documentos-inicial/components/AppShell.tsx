"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, FilePlus2, Users, School, BookOpenCheck, PenLine, ShieldCheck, Settings, Menu, X, LockKeyhole } from "lucide-react";
import { Brand } from "./Brand";
import { SairButton } from "./SairButton";
import type { UsuarioAutorizado } from "@/lib/auth-types";

const ITENS = [
  { href: "/", titulo: "Visão geral", Icon: LayoutDashboard, perfis: ["ADMINISTRADOR", "COORDENACAO_PEDAGOGICA", "INSPECAO_ESCOLAR"] },
  { href: "/emissao", titulo: "Emitir documento", Icon: FilePlus2, perfis: ["ADMINISTRADOR", "COORDENACAO_PEDAGOGICA"] },
  { href: "/alunos", titulo: "Alunos", Icon: Users, perfis: ["ADMINISTRADOR", "COORDENACAO_PEDAGOGICA"] },
  { href: "/matriculas", titulo: "Matrículas", Icon: BookOpenCheck, perfis: ["ADMINISTRADOR", "COORDENACAO_PEDAGOGICA"] },
  { href: "/cursos", titulo: "Cursos e turmas", Icon: School, perfis: ["ADMINISTRADOR", "COORDENACAO_PEDAGOGICA", "INSPECAO_ESCOLAR"] },
  { href: "/livro", titulo: "Livro Eletrônico", Icon: BookOpenCheck, perfis: ["ADMINISTRADOR", "COORDENACAO_PEDAGOGICA", "INSPECAO_ESCOLAR"] },
  { href: "/assinaturas", titulo: "Assinaturas", Icon: PenLine, perfis: ["ADMINISTRADOR", "COORDENACAO_PEDAGOGICA", "INSPECAO_ESCOLAR"] },
  { href: "/validacao", titulo: "Autenticidade", Icon: ShieldCheck, perfis: ["ADMINISTRADOR", "COORDENACAO_PEDAGOGICA", "INSPECAO_ESCOLAR"] },
  { href: "/configuracoes", titulo: "Configurações", Icon: Settings, perfis: ["ADMINISTRADOR"] },
];
const PERFIS: Record<string,string> = {
  ADMINISTRADOR: "Administrador Principal",
  COORDENACAO_PEDAGOGICA: "Coordenação Pedagógica",
  INSPECAO_ESCOLAR: "Inspeção Escolar",
};

export function AppShell({ children, usuario }: { children: ReactNode, usuario: UsuarioAutorizado }) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  return (
    <div className="app-shell">
      {aberto && <button className="overlay" type="button" aria-label="Fechar menu" onClick={() => setAberto(false)} />}
      <aside className={`sidebar ${aberto ? "sidebar-open" : ""}`}>
        <div className="side-head"><Brand/><button className="mobile-close" type="button" onClick={() => setAberto(false)} aria-label="Fechar menu"><X size={20}/></button></div>
        <div className="side-small">SISTEMA DOCUMENTAL</div>
        <nav className="side-nav" aria-label="Navegação principal">
          {ITENS.filter(i=>i.perfis.includes(usuario.perfil)).map(({ href, titulo, Icon }) =>
            <Link key={href} href={href} className={`nav-item ${pathname === href ? "nav-active" : ""}`} onClick={() => setAberto(false)}>
              <Icon size={18} aria-hidden="true" />{titulo}
            </Link>
          )}
        </nav>
        <div className="side-foot"><LockKeyhole size={17} aria-hidden="true"/><span>Área restrita. Acesso validado no Supabase.</span></div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="top-left"><button className="mobile-menu" onClick={() => setAberto(true)} type="button" aria-label="Abrir menu"><Menu size={23}/></button><span className="top-title">Grau Técnico <span> / Rio Centro</span></span></div>
          <div className="top-user"><span className="top-user-name">{usuario.nome}<small>{PERFIS[usuario.perfil]}</small></span><SairButton/></div>
        </header>
        <main className="content">{children}</main>
        <footer className="site-footer">Grau Técnico — Rio de Janeiro Centro • INEP 33194564 • v0.3 (cadastro de alunos real; demais módulos demonstrativos)</footer>
      </div>
    </div>
  );
}
