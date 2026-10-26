import { createHash, randomUUID } from 'node:crypto';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = 'documentos-assinados-govbr';
const MAX_PDF_BYTES = 10 * 1024 * 1024;
const UPLOAD_ROLES = new Set(['ADMINISTRADOR', 'COORDENACAO_PEDAGOGICA']);
const UUID = /^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;

function reply(status: number, error: string) {
  return Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  // Impede requisições cross-site utilizando os cookies do usuário.
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) {
    return reply(403, 'Origem da solicitação não autorizada.');
  }

  const reportedLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(reportedLength) && reportedLength > MAX_PDF_BYTES + 200_000) {
    return reply(413, 'Arquivo maior que o limite de 10 MB.');
  }

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return reply(401, 'Sessão inválida. Entre novamente.');

  // Checagem do perfil no servidor, não em atributos enviados pelo navegador.
  const { data: cadastro, error: perfilError } = await supabase
    .from('usuarios_sistema').select('perfil, ativo')
    .eq('usuario_id', auth.user.id).maybeSingle();
  if (perfilError || !cadastro?.ativo || !UPLOAD_ROLES.has(cadastro.perfil)) {
    return reply(403, 'Seu perfil não permite receber PDFs assinados.');
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) {
    return reply(503, 'Recebimento ainda não configurado no servidor.');
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return reply(400, 'Envie uma solicitação válida contendo um arquivo PDF.');
  }

  const matriculaId = form.get('matricula_id');
  const arquivo = form.get('arquivo');
  if (typeof matriculaId !== 'string' || !UUID.test(matriculaId)) {
    return reply(400, 'Selecione uma matrícula válida.');
  }
  if (!(arquivo instanceof File) || !arquivo.size || arquivo.size > MAX_PDF_BYTES) {
    return reply(400, 'Selecione um PDF de até 10 MB.');
  }
  if (arquivo.type !== 'application/pdf' || !/\.pdf$/i.test(arquivo.name)) {
    return reply(400, 'Apenas arquivos PDF são aceitos.');
  }

  // Verificação superficial do contêiner. NÃO verifica assinaturas eletrônicas.
  const bytes = Buffer.from(await arquivo.arrayBuffer());
  if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
    return reply(400, 'O conteúdo enviado não corresponde a um PDF.');
  }
  const hash = createHash('sha256').update(bytes).digest('hex');
  const nomeOriginal = arquivo.name.replace(/[\\/\x00-\x1f\x7f]/g, '_').slice(0, 150);
  const admin = createAdminClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: bucket, error: bucketError } = await admin.storage.getBucket(BUCKET);
  if (bucketError || !bucket || bucket.public) {
    return reply(503, 'Armazenamento privado indisponível ou configurado incorretamente.');
  }

  const { data: matricula, error: matriculaError } = await admin
    .from('matriculas').select('id').eq('id', matriculaId).maybeSingle();
  if (matriculaError || !matricula) return reply(404, 'Matrícula não localizada.');

  // Caminho gerado exclusivamente pelo servidor; nenhuma sobrescrita é permitida.
  const caminho = `${matriculaId}/${randomUUID()}.pdf`;
  const { error: uploadError } = await admin.storage.from(BUCKET)
    .upload(caminho, bytes, { contentType: 'application/pdf', upsert: false, cacheControl: '0' });
  if (uploadError) return reply(502, 'Não foi possível armazenar o PDF.');

  const { data: registro, error: dbError } = await admin
    .from('pdfs_govbr_recebidos')
    .insert({
      matricula_id: matriculaId,
      bucket_id: BUCKET,
      caminho_arquivo: caminho,
      nome_original: nomeOriginal,
      tamanho_bytes: bytes.length,
      hash_sha256: hash,
      status_verificacao: 'PENDENTE',
      recebido_por: auth.user.id
    })
    .select('id, recebido_em, status_verificacao').single();

  if (dbError || !registro) {
    // Compensação: evita deixar arquivo órfão se o registro falhar.
    const { error: cleanupError } = await admin.storage.from(BUCKET).remove([caminho]);
    if (cleanupError) console.error('Falha na limpeza de arquivo não registrado.');
    return reply(500, 'Falha ao registrar o arquivo. O recebimento não foi confirmado.');
  }

  return Response.json({
    id: registro.id,
    recebido_em: registro.recebido_em,
    status: registro.status_verificacao,
    hash_sha256: hash,
    aviso: 'Recebido para conferência; assinatura não verificada e documento não oficial.'
  }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
}
