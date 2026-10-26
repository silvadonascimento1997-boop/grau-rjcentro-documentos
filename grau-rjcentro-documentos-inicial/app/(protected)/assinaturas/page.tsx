import { ExternalLink, FileCheck2, FileSignature, LockKeyhole, UploadCloud, ShieldAlert } from 'lucide-react';
import { DemoAlert } from '@/components/DemoAlert';
import { PageHeader } from '@/components/PageHeader';

/**
 * Versão 0.8: assinatura externa exclusivamente pelo portal GOV.BR.
 * Não é uma integração de API, nem habilita emissão oficial, upload ou validação automática.
 */
export default function Assinaturas() {
  return <>
    <PageHeader
      eyebrow="ASSINATURA ELETRÔNICA · ETAPA 0.8"
      title="Central de assinaturas — GOV.BR"
      description="Assinatura externa no portal oficial e conferência no validador do ITI."
    />
    <DemoAlert>
      Fluxo GOV.BR em implantação. Nenhum documento é enviado automaticamente ao governo.
      O recebimento de PDFs assinados e a emissão oficial permanecem indisponíveis.
      Não utilize documentos reais para testar esta versão.
    </DemoAlert>
    <div className="two-card-grid">
      <section className="surface">
        <div className="section-name"><FileSignature size={21}/><h2>1. Assinar pelo GOV.BR</h2></div>
        <p className="secondary-text">
          A assinatura ocorre fora do Sistema Documental. Use uma conta GOV.BR de nível
          prata ou ouro e um PDF autorizado para esse procedimento.
        </p>
        <a className="btn btn-primary" href="https://assinador.iti.br/" target="_blank" rel="noopener noreferrer">
          <ExternalLink size={17}/> Abrir assinador GOV.BR
        </a>
      </section>
      <section className="surface">
        <div className="section-name"><FileCheck2 size={21}/><h2>2. Conferir as assinaturas</h2></div>
        <p className="secondary-text">
          Após baixar o arquivo, utilize o VALIDADOR do ITI para conferir signatários,
          integridade e resultado da verificação. Havendo duas assinaturas, confira
          o documento final após ambas.
        </p>
        <a className="btn btn-light" href="https://validar.iti.gov.br/" target="_blank" rel="noopener noreferrer">
          <ExternalLink size={17}/> Abrir validador do ITI
        </a>
      </section>
    </div>
    <section className="surface" style={{marginBottom:18}}>
      <div className="section-name"><UploadCloud size={21}/><h2>3. Importação e guarda do PDF assinado</h2></div>
      <p className="secondary-text">
        O recebimento seguro do PDF, a verificação técnica e o vínculo com a matrícula
        ainda não foram implementados. O sistema não recebe nem homologa documentos assinados nesta etapa.
      </p>
      <button className="btn btn-disabled" disabled type="button">
        <LockKeyhole size={17}/> Importar PDF assinado (indisponível)
      </button>
    </section>
    <section className="surface">
      <div className="section-name"><ShieldAlert size={21}/><h2>Emissão escolar oficial bloqueada</h2></div>
      <p className="secondary-text" style={{marginBottom:0}}>
        A documentação eletrônica de escolaridade exige as assinaturas do Diretor Escolar ou
        Substituto e do Secretário Escolar, conforme a regulamentação aplicável.
        Não se presume que a assinatura avançada GOV.BR substitua certificado ICP-Brasil
        para essa finalidade sem confirmação normativa. Nenhum código CEE,
        PDF oficial ou registro no Livro Eletrônico será gerado nesta etapa.
      </p>
    </section>
  </>;
}
