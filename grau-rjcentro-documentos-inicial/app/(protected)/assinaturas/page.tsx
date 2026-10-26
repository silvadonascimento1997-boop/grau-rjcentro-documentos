import { ExternalLink, FileCheck2, FileSignature, ShieldAlert } from 'lucide-react';
import { DemoAlert } from '@/components/DemoAlert';
import { PageHeader } from '@/components/PageHeader';
import { GovBrUploadClient } from '@/components/GovBrUploadClient';

export default function Assinaturas() {
  return <>
    <PageHeader eyebrow="ASSINATURA ELETRÔNICA · ETAPA 0.8"
      title="Central de assinaturas — GOV.BR"
      description="Assinatura externa, recebimento para conferência e validação pelo ITI." />
    <DemoAlert>
      Ambiente experimental: não utilize arquivos ou dados reais. O recebimento de PDF não
      verifica a assinatura eletrônica. Emissão oficial, numeração CEE e Livro Eletrônico
      continuam bloqueados até a conclusão técnica e jurídica do procedimento.
    </DemoAlert>
    <div className="two-card-grid">
      <section className="surface">
        <div className="section-name"><FileSignature size={21}/><h2>1. Assinar pelo GOV.BR</h2></div>
        <p className="secondary-text">Assine externamente no portal oficial com uma conta GOV.BR habilitada. O sistema não assina automaticamente.</p>
        <a className="btn btn-primary" href="https://assinador.iti.br/" target="_blank" rel="noopener noreferrer">
          <ExternalLink size={17}/> Abrir assinador GOV.BR
        </a>
      </section>
      <section className="surface">
        <div className="section-name"><FileCheck2 size={21}/><h2>2. Conferir as assinaturas</h2></div>
        <p className="secondary-text">Use o VALIDADOR do ITI para verificar integridade, signatários e resultado da verificação do arquivo final.</p>
        <a className="btn btn-light" href="https://validar.iti.gov.br/" target="_blank" rel="noopener noreferrer">
          <ExternalLink size={17}/> Abrir validador do ITI
        </a>
      </section>
    </div>
    <GovBrUploadClient />
    <section className="surface">
      <div className="section-name"><ShieldAlert size={21}/><h2>Emissão escolar oficial bloqueada</h2></div>
      <p className="secondary-text" style={{marginBottom:0}}>
        A assinatura eletrônica avançada GOV.BR não deve ser presumida substituta da
        assinatura qualificada ICP-Brasil para documentos escolares sem respaldo normativo.
        O recebimento é apenas uma etapa administrativa de conferência e não valida documentos
        nem cria registros no Livro Eletrônico.
      </p>
    </section>
  </>;
}
