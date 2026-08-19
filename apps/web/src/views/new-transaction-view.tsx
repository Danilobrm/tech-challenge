'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { TransactionForm } from '@/components/transactions/transaction-form';
import { Alert } from '@/components/ui/alert';
import { InlineLink } from '@/components/ui/inline-link';
import { ApiError } from '@/lib/api/api-error';
import { createTransaction } from '@/lib/api/transactions';
import { EMPTY_DRAFT, validateDraft } from '@/lib/transactions/transaction-draft';
import type { DraftErrors, TransactionDraft } from '@/lib/transactions/transaction-draft';

/**
 * `sending` existe separado de `idle` porque e ele que desabilita o botao, e `failed` guarda
 * a frase da API. `rejected` e a recusa do proprio formulario, antes de qualquer requisicao:
 * o texto de cada campo ja esta sob o campo, e o que falta e um aviso que o leitor de tela
 * anuncie.
 */
type Submission =
  | { kind: 'idle' }
  | { kind: 'rejected' }
  | { kind: 'sending' }
  | { kind: 'failed'; message: string };

function describeFailure(error: unknown): string {
  if (error instanceof ApiError) {
    return error.kind === 'network'
      ? 'Nao foi possivel falar com a API. Verifique se o servico de transacoes esta no ar.'
      : error.message;
  }

  return 'Nao foi possivel criar a transacao.';
}

export function NewTransactionView() {
  const router = useRouter();
  const [draft, setDraft] = useState<TransactionDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [submission, setSubmission] = useState<Submission>({ kind: 'idle' });
  // Numero da tentativa, usado como `key` do aviso. Duas submissoes seguidas com o mesmo
  // texto nao mudariam o no do DOM, e uma regiao viva que nao muda nao e reanunciada — o
  // segundo clique ficaria mudo para quem usa leitor de tela.
  const [attempt, setAttempt] = useState(0);

  async function submit() {
    setAttempt((current) => current + 1);

    // Mesmo schema que a API aplica no corpo: o que a tela recusa aqui, ela recusaria la —
    // a diferenca e que o usuario descobre antes de esperar a ida e a volta.
    const validation = validateDraft(draft);

    if (!validation.valid) {
      setErrors(validation.errors);
      setSubmission({ kind: 'rejected' });
      return;
    }

    setErrors({});
    setSubmission({ kind: 'sending' });

    try {
      const created = await createTransaction(validation.input);

      // Segue enviando ate a rota trocar: reabilitar o botao com a navegacao a caminho
      // convidaria a criar a mesma transacao duas vezes.
      router.push(`/transactions/${created.transactionExternalId}`);
    } catch (error) {
      setSubmission({ kind: 'failed', message: describeFailure(error) });
    }
  }

  return (
    <section aria-labelledby="criacao-titulo" className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <InlineLink href="/" className="self-start text-sm">
          Voltar para a listagem
        </InlineLink>
        <h1 id="criacao-titulo" className="text-2xl font-semibold tracking-tight text-ink">
          Nova transacao
        </h1>
        <p className="text-sm text-ink-muted">
          A transacao nasce pendente. A antifraude valida depois, fora desta requisicao.
        </p>
      </header>

      {submission.kind === 'rejected' && Object.keys(errors).length > 0 && (
        <Alert key={attempt}>Corrija os campos destacados para enviar.</Alert>
      )}

      {submission.kind === 'failed' && <Alert key={attempt}>{submission.message}</Alert>}

      <TransactionForm
        value={draft}
        errors={errors}
        submitting={submission.kind === 'sending'}
        onChange={(next) => {
          setDraft(next);
          // O erro de um campo sai assim que ele muda, e o aviso do topo some junto quando
          // nao sobrou nenhum: manter o texto discordaria do que esta escrito na tela.
          setErrors((current) => {
            const remaining = { ...current };

            for (const field of Object.keys(remaining) as Array<keyof DraftErrors>) {
              if (next[field] !== draft[field]) {
                delete remaining[field];
              }
            }

            return remaining;
          });
        }}
        onSubmit={() => {
          void submit();
        }}
      />
    </section>
  );
}
