
import { exigirUsuario } from '@/lib/auth';
import { MatriculasClient } from '@/components/MatriculasClient';
import './matriculas.css';

export default async function PaginaMatriculas() {
  await exigirUsuario(['ADMINISTRADOR', 'COORDENACAO_PEDAGOGICA']);
  return <MatriculasClient />;
}
