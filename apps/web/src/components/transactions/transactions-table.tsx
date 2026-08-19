import type { TransactionView } from '@challenge/contracts';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { formatCurrency, formatDateTime, statusText, statusTone } from '@/lib/transactions/format';

const CELL = 'px-4 py-3 text-left align-middle';

export function TransactionsTable({ items }: { items: readonly TransactionView[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Transacoes encontradas</caption>
          <thead>
            <tr className="border-b border-line bg-surface-muted">
              <th scope="col" className={cn(CELL, 'text-xs font-medium text-ink-muted')}>
                Identificador
              </th>
              <th scope="col" className={cn(CELL, 'text-xs font-medium text-ink-muted')}>
                Tipo
              </th>
              <th scope="col" className={cn(CELL, 'text-xs font-medium text-ink-muted')}>
                Status
              </th>
              <th scope="col" className={cn(CELL, 'text-right text-xs font-medium text-ink-muted')}>
                Valor
              </th>
              <th scope="col" className={cn(CELL, 'text-xs font-medium text-ink-muted')}>
                Criada em
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((transaction) => (
              <tr
                key={transaction.transactionExternalId}
                className="border-b border-line last:border-b-0 hover:bg-surface-muted"
              >
                {/* Cabecalho da linha: e o identificador que da nome a ela para quem navega
                    por leitor de tela. */}
                <th
                  scope="row"
                  className={cn(CELL, 'font-mono text-xs font-normal text-ink-muted')}
                >
                  {transaction.transactionExternalId}
                </th>
                <td className={cn(CELL, 'text-ink')}>{transaction.transactionType.name}</td>
                <td className={CELL}>
                  <Badge tone={statusTone(transaction.transactionStatus.name)}>
                    {statusText(transaction.transactionStatus.name)}
                  </Badge>
                </td>
                <td className={cn(CELL, 'text-right font-medium tabular-nums text-ink')}>
                  {formatCurrency(transaction.value)}
                </td>
                <td className={cn(CELL, 'whitespace-nowrap text-ink-muted tabular-nums')}>
                  {formatDateTime(transaction.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
