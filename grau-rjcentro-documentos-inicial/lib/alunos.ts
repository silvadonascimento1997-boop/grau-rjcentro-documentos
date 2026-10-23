export type Aluno = {
  id: string;
  nome_completo: string;
  cpf: string | null;
  rg: string | null;
  orgao_expedidor: string | null;
  data_nascimento: string | null;
  naturalidade: string | null;
  nome_mae: string | null;
  nome_pai: string | null;
  email: string | null;
  telefone: string | null;
};

export type AlunoForm = Omit<Aluno, 'id'>;
export const CAMPOS_ALUNO: (keyof AlunoForm)[] = [
  'nome_completo', 'cpf', 'rg', 'orgao_expedidor', 'data_nascimento',
  'naturalidade', 'nome_mae', 'nome_pai', 'email', 'telefone'
];

export const ALUNO_VAZIO: AlunoForm = {
  nome_completo: '', cpf: '', rg: '', orgao_expedidor: '',
  data_nascimento: '', naturalidade: '', nome_mae: '', nome_pai: '',
  email: '', telefone: ''
};

export const ROTULOS: Record<keyof AlunoForm, string> = {
  nome_completo: 'Nome completo', cpf: 'CPF', rg: 'RG',
  orgao_expedidor: 'Órgão expedidor', data_nascimento: 'Data de nascimento',
  naturalidade: 'Naturalidade', nome_mae: 'Nome da mãe',
  nome_pai: 'Nome do pai', email: 'E-mail', telefone: 'Telefone'
};

export function somenteDigitos(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '');
}

export function normalizarCpf(value: unknown): string {
  // Alguns Excel gravam o CPF como número e eliminam zeros à esquerda.
  const raw = somenteDigitos(value);
  if (!raw) return '';
  return raw.padStart(11, '0');
}

export function cpfValido(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  for (let d = 9; d <= 10; d++) {
    const total = cpf.slice(0, d).split('').reduce((acc, n, i) => acc + Number(n) * (d + 1 - i), 0);
    const resto = (total * 10) % 11;
    const digito = resto === 10 ? 0 : resto;
    if (Number(cpf[d]) !== digito) return false;
  }
  return true;
}

export function normalizarData(value: unknown): string {
  if (value == null || value === '') return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const str = String(value).trim();
  const brasileiro = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brasileiro) return `${brasileiro[3]}-${brasileiro[2]}-${brasileiro[1]}`;
  return str;
}

export function validarAluno(form: AlunoForm): string | null {
  if (!String(form.nome_completo ?? '').trim()) return 'Informe o nome completo.';
  const cpf = normalizarCpf(form.cpf);
  if (!cpf || !cpfValido(cpf)) return 'Informe um CPF válido com 11 dígitos.';
  if (form.data_nascimento) {
    const data = normalizarData(form.data_nascimento);
    const dt = new Date(`${data}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(dt.getTime()) || dt.toISOString().slice(0,10) !== data || dt > new Date()) return 'Data de nascimento inválida.';
  }
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'E-mail inválido.';
  return null;
}

export function prepararAluno(form: AlunoForm): AlunoForm {
  return {
    nome_completo: form.nome_completo.trim().replace(/\s+/g,' '),
    cpf: normalizarCpf(form.cpf),
    rg: form.rg?.trim() || null, orgao_expedidor: form.orgao_expedidor?.trim() || null,
    data_nascimento: normalizarData(form.data_nascimento) || null,
    naturalidade: form.naturalidade?.trim() || null,
    nome_mae: form.nome_mae?.trim() || null,
    nome_pai: form.nome_pai?.trim() || null,
    email: form.email?.trim().toLowerCase() || null,
    telefone: form.telefone?.trim() || null
  };
}

export function cpfExibicao(value: string | null): string {
  const cpf = somenteDigitos(value);
  return cpf.length === 11 ? cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '—';
}
