import { createTransactionSchema } from '@challenge/contracts';
import type { CreateTransactionInput } from '@challenge/contracts';

/**
 * O que os campos do formulario seguram: tudo texto, porque e o que `<input>` e `<select>`
 * produzem. A conversao para o formato da API acontece num lugar so, aqui, e nao espalhada
 * pelos manipuladores de evento do componente.
 */
export interface TransactionDraft {
  accountExternalIdDebit: string;
  accountExternalIdCredit: string;
  transferTypeId: string;
  value: string;
}

export const EMPTY_DRAFT: TransactionDraft = {
  accountExternalIdDebit: '',
  accountExternalIdCredit: '',
  transferTypeId: '',
  value: '',
};

export type DraftField = keyof TransactionDraft;

export type DraftErrors = Partial<Record<DraftField, string>>;

export type DraftValidation =
  { valid: true; input: CreateTransactionInput } | { valid: false; errors: DraftErrors };

const DRAFT_FIELDS: readonly DraftField[] = [
  'accountExternalIdDebit',
  'accountExternalIdCredit',
  'transferTypeId',
  'value',
];

function isDraftField(path: PropertyKey | undefined): path is DraftField {
  return DRAFT_FIELDS.includes(path as DraftField);
}

/**
 * Campo vazio vira `NaN`, e nao zero. `Number('')` e zero, e um valor em branco chegaria ao
 * schema como uma transacao de zero real — recusada pela regra certa, mas com a mensagem
 * errada ("valor deve ser maior que zero" em vez de "informe o valor").
 *
 * A virgula e aceita como separador decimal porque e o que o teclado brasileiro oferece
 * primeiro. Separador de milhar continua fora: "1.000,50" nao tem leitura unica sem saber
 * o idioma do usuario, e adivinhar erraria o valor de uma transacao financeira.
 */
function toNumber(text: string): number {
  const normalized = text.trim().replace(',', '.');

  return normalized === '' ? Number.NaN : Number(normalized);
}

/**
 * Valida o rascunho com o mesmo schema que a API usa no `POST /transactions`. E o ponto do
 * reaproveitamento: a tela nao mantem uma segunda copia das regras, entao um limite que
 * mudar no contrato passa a valer nos dois lados no mesmo commit.
 *
 * O erro sai por campo porque e assim que ele e mostrado — sob o rotulo, ao lado do que
 * precisa ser corrigido, e nao numa lista solta no topo da pagina.
 */
export function validateDraft(draft: TransactionDraft): DraftValidation {
  const result = createTransactionSchema.safeParse({
    accountExternalIdDebit: draft.accountExternalIdDebit.trim(),
    accountExternalIdCredit: draft.accountExternalIdCredit.trim(),
    transferTypeId: toNumber(draft.transferTypeId),
    value: toNumber(draft.value),
  });

  if (result.success) {
    return { valid: true, input: result.data };
  }

  const errors: DraftErrors = {};

  for (const issue of result.error.issues) {
    const field = issue.path[0];

    // O primeiro erro de cada campo e o que fica: mostrar dois embaixo do mesmo rotulo
    // faria o usuario corrigir duas vezes o mesmo valor.
    if (isDraftField(field) && errors[field] === undefined) {
      errors[field] = issue.message;
    }
  }

  return { valid: false, errors };
}
