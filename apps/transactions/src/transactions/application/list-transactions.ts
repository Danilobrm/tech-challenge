import type { ListTransactionsQuery, PageMetadata } from '@challenge/contracts';

import type { PersistedTransaction } from '../domain/transaction';
import { toStatusName } from '../domain/transaction-status';
import type { TransactionReader } from '../domain/transaction.ports';

export interface TransactionListPage {
  items: PersistedTransaction[];
  pagination: PageMetadata;
}

/**
 * Traduz a query da borda para a consulta do banco e devolve a pagina com os metadados.
 *
 * A paginacao e por deslocamento: `page` e `pageSize` viram `skip` e `take`. O calculo
 * mora aqui, e nao no adaptador, porque e regra da listagem — nao detalhe de Prisma.
 */
export class ListTransactions {
  constructor(private readonly transactions: TransactionReader) {}

  async execute(query: ListTransactionsQuery): Promise<TransactionListPage> {
    const { items, total } = await this.transactions.list({
      filters: {
        status: query.status === undefined ? undefined : toStatusName(query.status),
        transferTypeId: query.transferTypeId,
        createdFrom: query.from,
        createdTo: query.to,
      },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });

    return {
      items,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        // Zero paginas quando nao ha nada: a alternativa seria dizer que existe uma pagina
        // que o cliente ja sabe estar vazia.
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }
}
