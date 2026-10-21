"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, FilePlus2, Users, School, BookOpenCheck, PenLine, ShieldCheck, Settings, Menu, X, LockKeyhole } from "lucide-react";
import { Brand } from "./Brand";

const ITENS = [
  { href: "/", titulo: "Visão geral", Icon: LayoutDashboard },
  { href: "/emissao", titulo: "Emitir documento", Icon: FilePlus2 },
  { href: "/alunos", titulo: "Alunos", Icon: Users },
  { href: "/cursos", titulo: "Cursos e turmas", Icon: School },
  { href: "/livro", titulo: "Livro Eletrônico", Icon: BookOpenCheck },
  { href: "/assinaturas", titulo: "Assinaturas", Icon: PenLine },
  { href: "/validacao", titulo: "Autenticidade", Icon: ShieldCheck },
  { href: "/configuracoes", titulo: "Configurações", Icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  return (
    <div className="app-shell">
      {aberto && <button className="overlay" type="button" aria-label="Fechar menu" onClick={() => setAberto(false)} />}
      <aside className={`sidebar ${aberto ? "sidebar-open" : ""}`}>
        <div className="side-head"><Brand/><button className="mobile-close" type="button" onClick={() => setAberto(false)} aria-label="Fechar menu"><X size={20}/></button></div>
        <div className="side-small">SISTEMA DOCUMENTAL</div>
        <nav className="side-nav" aria-label="Navegação principal">
          {ITENS.map(({ href, titulo, Icon }) => <Link key={href} href={href} className={`nav-item ${pathname === href ? "nav-active" : ""}`} onClick={() => setAberto(false)}><Icon size={18} aria-hidden="true" />{titulo}</Link>)}
        </nav>
        <div className="side-foot"><LockKeyhole size={17} aria-hidden="true"/><span>Login e permissões serão ativados na etapa Supabase.</span></div>
      </aside>
      <div className="main-column">
        <header className="topbar"><div className="top-left"><button className="mobile-menu" onClick={() => setAberto(true)} type="button" aria-label="Abrir menu"><Menu size={23}/></button><span className="top-title">Grau Técnico <span> / Rio Centro</span></span></div><span className="top-chip">Ambiente demonstrativo</span></header>
        <main className="content">{children}</main>
        <footer className="site-footer">Grau Técnico — Rio de Janeiro Centro • INEP 33194564 • Estrutura inicial v0.1</footer>
      </div>
    </div>
  );
}
