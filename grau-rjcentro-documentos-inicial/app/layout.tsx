import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistema Documental | Grau Técnico RJ Centro",
  description: "Emissão e registro eletrônico de documentos escolares da unidade Rio de Janeiro Centro.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
