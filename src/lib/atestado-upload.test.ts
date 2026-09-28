import { describe, expect, it } from 'vitest';
import { ATESTADO_ACCEPT, extensaoAtestado, validarArquivoAtestado } from '@/lib/atestado-upload';

describe('validação de anexos de atestado', () => {
  it.each([
    ['application/pdf', 'pdf'],
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/webp', 'webp'],
  ])('aceita %s e resolve extensão canônica', (type, extension) => {
    const file = { type, size: 1024 };
    expect(validarArquivoAtestado(file)).toBeNull();
    expect(extensaoAtestado(file)).toBe(extension);
  });

  it('rejeita tipos que o bucket não permite, inclusive MIME vazio', () => {
    expect(validarArquivoAtestado({ type: 'application/msword', size: 1024 })).toMatch(/Formato não suportado/);
    expect(validarArquivoAtestado({ type: '', size: 1024 })).toMatch(/Formato não suportado/);
    expect(extensaoAtestado({ type: 'image/svg+xml' })).toBeNull();
    expect(ATESTADO_ACCEPT).not.toContain('.doc');
  });

  it('rejeita arquivos vazios e maiores que o limite de 10 MB', () => {
    expect(validarArquivoAtestado({ type: 'application/pdf', size: 0 })).toMatch(/vazio/);
    expect(validarArquivoAtestado({ type: 'image/jpeg', size: 10 * 1024 * 1024 })).toBeNull();
    expect(validarArquivoAtestado({ type: 'image/jpeg', size: 10 * 1024 * 1024 + 1 })).toMatch(/10 MB/);
  });
});
