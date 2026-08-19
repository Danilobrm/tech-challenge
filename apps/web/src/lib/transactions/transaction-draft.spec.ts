import { describe, expect, it } from 'vitest';

import { EMPTY_DRAFT, validateDraft } from '@/lib/transactions/transaction-draft';
import type { TransactionDraft } from '@/lib/transactions/transaction-draft';

const filled: TransactionDraft = {
  accountExternalIdDebit: '0199a2b1-6f4a-7c3d-8e1f-2a3b4c5d6e72',
  accountExternalIdCredit: '0199a2b1-6f4a-7c3d-8e1f-2a3b4c5d6e73',
  transferTypeId: '1',
  value: '1000.50',
};

describe('validateDraft', () => {
  it('converte o texto dos campos para o corpo que a api espera', () => {
    const result = validateDraft(filled);

    expect(result).toEqual({
      valid: true,
      input: {
        accountExternalIdDebit: filled.accountExternalIdDebit,
        accountExternalIdCredit: filled.accountExternalIdCredit,
        transferTypeId: 1,
        value: 1000.5,
      },
    });
  });

  it('aponta cada campo em branco, sem tratar vazio como zero', () => {
    const result = validateDraft(EMPTY_DRAFT);

    expect(result).toMatchObject({
      valid: false,
      errors: {
        accountExternalIdDebit: 'informe um identificador de conta valido',
        accountExternalIdCredit: 'informe um identificador de conta valido',
        transferTypeId: 'escolha o tipo de transferencia',
        value: 'informe o valor da transacao',
      },
    });
  });

  it('recusa valor com mais de duas casas decimais', () => {
    expect(validateDraft({ ...filled, value: '10.005' })).toMatchObject({
      valid: false,
      errors: { value: 'valor deve ter no maximo duas casas decimais' },
    });
  });

  it('aceita virgula como separador decimal', () => {
    expect(validateDraft({ ...filled, value: '1000,50' })).toMatchObject({
      valid: true,
      input: { value: 1000.5 },
    });
  });

  it('recusa texto que nao e numero no valor', () => {
    expect(validateDraft({ ...filled, value: 'mil' })).toMatchObject({
      valid: false,
      errors: { value: 'informe o valor da transacao' },
    });
  });

  it('recusa valor zerado', () => {
    expect(validateDraft({ ...filled, value: '0' })).toMatchObject({
      valid: false,
      errors: { value: 'valor deve ser maior que zero' },
    });
  });

  // O identificador costuma chegar colado da area de transferencia, com espaco em volta.
  it('ignora espaco em volta do identificador', () => {
    const result = validateDraft({
      ...filled,
      accountExternalIdDebit: `  ${filled.accountExternalIdDebit}  `,
    });

    expect(result).toMatchObject({ valid: true });
  });
});
