import type { ReactNode } from 'react';
import type { TransactionView } from '@challenge/contracts';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { formatCurrency, formatDateTime, statusText, statusTone } from '@/lib/transactions/format';

/**
 * Lista de definicao, e nao tabela de uma linha so: aqui cada rotulo descreve um campo do
 * mesmo registro, e e isso que `dt`/`dd` dizem. Tabela prometeria linhas comparaveis entre si.
 */
function Entry({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-line px-5 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-xs font-medium text-ink-muted">{label}</dt>
      <dd className={cn('text-sm text-ink', className)}>{children}</dd>
    </div>
  );
}

export function TransactionDetailCard({ transaction }: { transaction: TransactionView }) {
  return (
    <Card>
      <dl>
        <Entry label="Identificador" className="font-mono text-xs break-all text-ink-muted">
          {transaction.transactionExternalId}
        </Entry>
        <Entry label="Tipo">{transaction.transactionType.name}</Entry>
        <Entry label="Status">
          <Badge tone={statusTone(transaction.transactionStatus.name)}>
            {statusText(transaction.transactionStatus.name)}
          </Badge>
        </Entry>
        <Entry label="Valor" className="font-medium tabular-nums">
          {formatCurrency(transaction.value)}
        </Entry>
        <Entry label="Criada em" className="tabular-nums">
          {formatDateTime(transaction.createdAt)}
        </Entry>
      </dl>
    </Card>
  );
}
