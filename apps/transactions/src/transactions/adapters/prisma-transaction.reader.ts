import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma/client.js';
import type {
  PersistedTransaction,
  TransactionFilters,
  TransactionPage,
  TransactionPageQuery,
} from '../domain/transaction';
import type { TransactionReader } from '../domain/transaction.ports';
import { toPersistedTransaction } from './to-persisted-transaction';

/**
 * Monta o `WHERE` a partir dos filtros presentes. O Prisma ignora `undefined` dentro do
 * filtro, entao montar so o que existe nao muda a consulta — muda a leitura do codigo: o
 * objeto passa a mostrar exatamente as condicoes que vao para o banco. E evita o
 * `createdAt: {}` vazio, que seria uma condicao sem condicao nenhuma.
 */
function toWhere(filters: TransactionFilters): Prisma.TransactionWhereInput {
  const hasPeriod = filters.createdFrom !== undefined || filters.createdTo !== undefined;

  return {
    ...(filters.status === undefined ? {} : { status: filters.status }),
    ...(filters.transferTypeId === undefined ? {} : { transferTypeId: filters.transferTypeId }),
    ...(hasPeriod
      ? {
          createdAt: {
            ...(filters.createdFrom === undefined ? {} : { gte: filters.createdFrom }),
            ...(filters.createdTo === undefined ? {} : { lte: filters.createdTo }),
          },
        }
      : {}),
  };
}

@Injectable()
export class PrismaTransactionReader implements TransactionReader {
  constructor(private readonly prisma: PrismaService) {}

  async findById(transactionExternalId: string): Promise<PersistedTransaction | null> {
    const found = await this.prisma.transaction.findUnique({
      where: { id: transactionExternalId },
      include: { transferType: true },
    });

    return found === null ? null : toPersistedTransaction(found);
  }

  async list(query: TransactionPageQuery): Promise<TransactionPage> {
    const where = toWhere(query.filters);

    // Pagina e contagem precisam enxergar o mesmo estado, senao o total descreve um
    // conjunto e os itens descrevem outro. No READ COMMITTED padrao do Postgres cada
    // comando tira o proprio snapshot, e uma criacao entre os dois ja bastaria para isso —
    // dai o isolamento explicito. Sao duas leituras, entao nao ha risco de conflito de
    // serializacao.
    const [rows, total] = await this.prisma.$transaction(
      [
        this.prisma.transaction.findMany({
          where,
          include: { transferType: true },
          // O desempate por id e o que torna a paginacao por deslocamento estavel: sem
          // ele, duas transacoes criadas no mesmo milissegundo podem trocar de lugar entre
          // uma pagina e a seguinte, sumindo de uma e repetindo na outra.
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: query.skip,
          take: query.take,
        }),
        this.prisma.transaction.count({ where }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );

    return { items: rows.map(toPersistedTransaction), total };
  }
}
