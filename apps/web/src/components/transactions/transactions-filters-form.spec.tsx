import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { TransactionsFiltersForm } from '@/components/transactions/transactions-filters-form';
import { EMPTY_FILTERS } from '@/lib/transactions/list-params';
import type { TransactionFilters } from '@/lib/transactions/list-params';

function renderForm(value: TransactionFilters = EMPTY_FILTERS, busy = false, canClear?: boolean) {
  const onChange = vi.fn();
  const onApply = vi.fn();
  const onClear = vi.fn();

  render(
    <TransactionsFiltersForm
      value={value}
      onChange={onChange}
      onApply={onApply}
      onClear={onClear}
      canClear={canClear ?? value !== EMPTY_FILTERS}
      busy={busy}
    />,
  );

  return { onChange, onApply, onClear };
}

describe('TransactionsFiltersForm', () => {
  it('associa um rotulo a cada campo', () => {
    renderForm();

    expect(screen.getByLabelText('Status')).toBeTruthy();
    expect(screen.getByLabelText('Tipo')).toBeTruthy();
    expect(screen.getByLabelText('De')).toBeTruthy();
    expect(screen.getByLabelText('Ate')).toBeTruthy();
  });

  it('oferece todos os status, mais a opcao de nao filtrar', () => {
    renderForm();

    const options = screen.getByLabelText('Status').querySelectorAll('option');

    expect([...options].map((option) => option.textContent)).toEqual([
      'Todos',
      'Pendente',
      'Aprovada',
      'Rejeitada',
    ]);
  });

  it('anuncia a mudanca de cada campo sem buscar sozinho', () => {
    const { onChange, onApply } = renderForm();

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'approved' } });

    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, status: 'approved' });
    expect(onApply).not.toHaveBeenCalled();
  });

  it('volta a nao filtrar quando o usuario escolhe todos', () => {
    const { onChange } = renderForm({ ...EMPTY_FILTERS, status: 'approved' });

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: '' } });

    expect(onChange).toHaveBeenCalledWith(EMPTY_FILTERS);
  });

  it('aplica os filtros quando o formulario e enviado', () => {
    const { onApply } = renderForm({ ...EMPTY_FILTERS, transferTypeId: '2' });

    fireEvent.click(screen.getByRole('button', { name: /aplicar filtros/i }));

    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it('impede outra busca enquanto a atual nao volta', () => {
    renderForm(EMPTY_FILTERS, true);

    expect(screen.getByRole('button', { name: /aplicar filtros/i })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('so oferece limpar quando ha o que limpar', () => {
    renderForm();

    expect(screen.getByRole('button', { name: /limpar filtros/i })).toHaveProperty(
      'disabled',
      true,
    );
  });

  it('limpa os filtros preenchidos', () => {
    const { onClear } = renderForm({ ...EMPTY_FILTERS, from: '2026-08-01' });

    fireEvent.click(screen.getByRole('button', { name: /limpar filtros/i }));

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('barra o periodo invertido no proprio campo', () => {
    renderForm({ ...EMPTY_FILTERS, from: '2026-08-10', to: '2026-08-20' });

    expect(screen.getByLabelText('De')).toHaveProperty('max', '2026-08-20');
    expect(screen.getByLabelText('Ate')).toHaveProperty('min', '2026-08-10');
  });

  it('recusa data fora do calendario que a api aceita', () => {
    renderForm();

    // Ano de cinco digitos passa no campo nativo e sairia da query em silencio.
    expect(screen.getByLabelText('De')).toHaveProperty('max', '9999-12-31');
    expect(screen.getByLabelText('Ate')).toHaveProperty('max', '9999-12-31');
  });

  it('continua oferecendo limpar quando so a lista exibida esta filtrada', () => {
    const { onClear } = renderForm(EMPTY_FILTERS, false, true);

    fireEvent.click(screen.getByRole('button', { name: /limpar filtros/i }));

    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
