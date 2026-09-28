import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReportOptionsModal from '@/components/ReportOptionsModal';

describe('ReportOptionsModal', () => {
  it('passes the vacation option and does not offer the unimplemented attachment toggle', () => {
    const onGenerate = vi.fn();
    render(<ReportOptionsModal open onOpenChange={vi.fn()} onGenerate={onGenerate} generating={false} />);

    expect(screen.getByRole('checkbox', { name: 'Dias de férias' })).toBeChecked();
    expect(screen.queryByRole('checkbox', { name: 'Incluir anexos' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Gerar PDF' }));

    expect(onGenerate).toHaveBeenCalledWith(expect.objectContaining({ incluirFerias: true }));
    expect(onGenerate.mock.calls[0][0]).not.toHaveProperty('incluirAnexos');
  });
});
