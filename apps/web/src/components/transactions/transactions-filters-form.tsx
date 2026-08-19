'use client';

import type { FormEvent } from 'react';
import { TRANSFER_TYPES, transactionStatusLabelSchema } from '@challenge/contracts';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { TransactionFilters } from '@/lib/transactions/list-params';
import { statusText } from '@/lib/transactions/format';

/**
 * Fronteiras do campo de data. O `<input type="date">` aceita ano de cinco digitos, que o
 * conversor da query descarta — e o filtro sumiria em silencio, com a data ainda visivel na
 * tela. Limitar aqui faz o proprio navegador recusar antes disso.
 */
const FIRST_DAY = '1970-01-01';
const LAST_DAY = '9999-12-31';

interface TransactionsFiltersFormProps {
  value: TransactionFilters;
  onChange: (filters: TransactionFilters) => void;
  onApply: () => void;
  onClear: () => void;
  /**
   * Quem decide e a tela, e nao o formulario: os campos podem estar vazios enquanto a lista
   * exibida continua filtrada, e nesse caso limpar ainda e a acao que desfaz o filtro.
   */
  canClear: boolean;
  /** Enquanto a busca corrente nao volta, aplicar de novo so empilharia requisicao. */
  busy: boolean;
}

export function TransactionsFiltersForm({
  value,
  onChange,
  onApply,
  onClear,
  canClear,
  busy,
}: TransactionsFiltersFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onApply();
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} aria-labelledby="filtros-titulo" className="p-4">
        <h2 id="filtros-titulo" className="sr-only">
          Filtros
        </h2>

        {/* Grade, e nao linha flexivel: os campos guardam a mesma largura em qualquer
            tamanho de tela, e a linha nao quebra em degrau. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto] xl:items-end">
          <Field htmlFor="filtro-status" label="Status">
            <Select
              id="filtro-status"
              value={value.status}
              onChange={(event) => {
                // "Todos" e a opcao de valor vazio, que nao esta no vocabulario da API: o
                // parse falhar aqui significa filtro ausente, nao entrada invalida.
                const chosen = transactionStatusLabelSchema.safeParse(event.target.value);

                onChange({ ...value, status: chosen.success ? chosen.data : '' });
              }}
            >
              <option value="">Todos</option>
              {transactionStatusLabelSchema.options.map((status) => (
                <option key={status} value={status}>
                  {statusText(status)}
                </option>
              ))}
            </Select>
          </Field>

          <Field htmlFor="filtro-tipo" label="Tipo">
            <Select
              id="filtro-tipo"
              value={value.transferTypeId}
              onChange={(event) => {
                onChange({ ...value, transferTypeId: event.target.value });
              }}
            >
              <option value="">Todos</option>
              {TRANSFER_TYPES.map((type) => (
                <option key={type.id} value={String(type.id)}>
                  {type.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field htmlFor="filtro-de" label="De">
            {/* O `max` e o `min` do campo vizinho barram o periodo invertido no proprio
                navegador, antes de virar um 400 que o usuario teria de interpretar. */}
            <Input
              id="filtro-de"
              type="date"
              value={value.from}
              min={FIRST_DAY}
              max={value.to === '' ? LAST_DAY : value.to}
              onChange={(event) => {
                onChange({ ...value, from: event.target.value });
              }}
            />
          </Field>

          <Field htmlFor="filtro-ate" label="Ate">
            <Input
              id="filtro-ate"
              type="date"
              value={value.to}
              min={value.from === '' ? FIRST_DAY : value.from}
              max={LAST_DAY}
              onChange={(event) => {
                onChange({ ...value, to: event.target.value });
              }}
            />
          </Field>

          <div className="flex gap-2 sm:col-span-2 xl:col-span-1">
            <Button type="submit" variant="primary" disabled={busy} className="flex-1 xl:flex-none">
              Aplicar filtros
            </Button>
            <Button onClick={onClear} disabled={!canClear}>
              Limpar filtros
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
