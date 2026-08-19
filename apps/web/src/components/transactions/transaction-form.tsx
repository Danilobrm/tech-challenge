'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { TRANSFER_TYPES } from '@challenge/contracts';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, fieldErrorId } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import type {
  DraftErrors,
  DraftField,
  TransactionDraft,
} from '@/lib/transactions/transaction-draft';

const ACCOUNT_ID = {
  accountExternalIdDebit: 'conta-debito',
  accountExternalIdCredit: 'conta-credito',
} as const;

const TYPE_ID = 'tipo-transferencia';
const VALUE_ID = 'valor';

interface TransactionFormProps {
  value: TransactionDraft;
  /** Vazio nao significa "ainda nao validou": significa que nada esta errado agora. */
  errors: DraftErrors;
  submitting: boolean;
  onChange: (draft: TransactionDraft) => void;
  onSubmit: () => void;
}

/**
 * Atributos que ligam o campo ao proprio erro. Ficam numa funcao so para nao existir campo
 * marcado como invalido sem o texto que explica a recusa: `aria-invalid` sozinho avisa que
 * ha algo errado e nao diz o que.
 */
function invalidAttributes(id: string, error: string | undefined) {
  return error === undefined ? {} : { 'aria-invalid': true, 'aria-describedby': fieldErrorId(id) };
}

type AccountFieldName = keyof typeof ACCOUNT_ID;

interface AccountFieldProps {
  field: AccountFieldName;
  label: string;
  value: string;
  error: string | undefined;
  canGenerate: boolean;
  onChange: (field: DraftField, text: string) => void;
}

/**
 * As duas contas sao o mesmo campo com rotulo diferente. Nascem daqui para que o nome
 * acessivel do botao acompanhe o rotulo: dois botoes chamados so "Gerar" seriam
 * indistinguiveis para quem navega pela lista de controles.
 */
function AccountField({ field, label, value, error, canGenerate, onChange }: AccountFieldProps) {
  const id = ACCOUNT_ID[field];

  return (
    <Field htmlFor={id} label={label} error={error}>
      <div className="flex gap-2">
        <Input
          id={id}
          value={value}
          placeholder="00000000-0000-0000-0000-000000000000"
          onChange={(event) => {
            onChange(field, event.target.value);
          }}
          {...invalidAttributes(id, error)}
        />
        {/* As contas nao sao modeladas neste desafio: o identificador e um uuid qualquer, e
            digitar trinta e seis caracteres a mao so convida a erro. */}
        {canGenerate && (
          <Button
            aria-label={`Gerar identificador da ${label.toLowerCase()}`}
            onClick={() => {
              onChange(field, crypto.randomUUID());
            }}
          >
            Gerar
          </Button>
        )}
      </div>
    </Field>
  );
}

export function TransactionForm({
  value,
  errors,
  submitting,
  onChange,
  onSubmit,
}: TransactionFormProps) {
  // `crypto.randomUUID` so existe em contexto seguro: aberto por `http://` num IP da rede
  // local, ele e `undefined`, e o botao estouraria no clique. Decidido depois da montagem
  // porque o servidor sempre tem a funcao — decidir no render faria a hidratacao divergir.
  const [canGenerate, setCanGenerate] = useState(false);

  useEffect(() => {
    setCanGenerate(typeof globalThis.crypto?.randomUUID === 'function');
  }, []);

  function change(field: DraftField, text: string) {
    // O erro do campo sai assim que ele muda: mante-lo enquanto o usuario digita a correcao
    // faria a tela discordar do que esta escrito nela.
    onChange({ ...value, [field]: text });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} aria-labelledby="formulario-titulo" className="p-4">
        <h2 id="formulario-titulo" className="sr-only">
          Dados da transacao
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AccountField
            field="accountExternalIdDebit"
            label="Conta de debito"
            value={value.accountExternalIdDebit}
            error={errors.accountExternalIdDebit}
            canGenerate={canGenerate}
            onChange={change}
          />

          <AccountField
            field="accountExternalIdCredit"
            label="Conta de credito"
            value={value.accountExternalIdCredit}
            error={errors.accountExternalIdCredit}
            canGenerate={canGenerate}
            onChange={change}
          />

          <Field htmlFor={TYPE_ID} label="Tipo" error={errors.transferTypeId}>
            <Select
              id={TYPE_ID}
              value={value.transferTypeId}
              onChange={(event) => {
                change('transferTypeId', event.target.value);
              }}
              {...invalidAttributes(TYPE_ID, errors.transferTypeId)}
            >
              <option value="">Selecione</option>
              {TRANSFER_TYPES.map((type) => (
                <option key={type.id} value={String(type.id)}>
                  {type.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field htmlFor={VALUE_ID} label="Valor" error={errors.value}>
            {/* Campo de texto, e nao `type="number"`: o passo do controle numerico muda o
                valor com a roda do mouse sobre o campo focado, e virgula e ponto convivem
                aqui sem depender de como o navegador interpreta o teclado. */}
            <Input
              id={VALUE_ID}
              value={value.value}
              inputMode="decimal"
              placeholder="1000,00"
              onChange={(event) => {
                change('value', event.target.value);
              }}
              {...invalidAttributes(VALUE_ID, errors.value)}
            />
          </Field>
        </div>

        <div className="mt-4 flex justify-end">
          {/* Desabilitado enquanto envia: o `POST /transactions` nao e idempotente, entao um
              segundo clique cria uma segunda transacao, e nao a mesma de novo. */}
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting && <Spinner />}
            {submitting ? 'Enviando...' : 'Criar transacao'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
