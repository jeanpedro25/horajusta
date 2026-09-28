const MAX_ATESTADO_BYTES = 10 * 1024 * 1024;

const EXTENSAO_POR_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function validarArquivoAtestado(file: Pick<File, 'type' | 'size'>): string | null {
  if (!EXTENSAO_POR_MIME[file.type]) {
    return 'Formato não suportado. Envie PDF, JPEG, PNG ou WebP.';
  }
  if (file.size <= 0) return 'O arquivo está vazio.';
  if (file.size > MAX_ATESTADO_BYTES) return 'O arquivo deve ter no máximo 10 MB.';
  return null;
}

export function extensaoAtestado(file: Pick<File, 'type'>): string | null {
  return EXTENSAO_POR_MIME[file.type] ?? null;
}

export const ATESTADO_ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp';
