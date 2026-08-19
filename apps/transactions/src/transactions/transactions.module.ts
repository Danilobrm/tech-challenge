import { Module } from '@nestjs/common';

import { RandomIdGenerator, SystemClock } from '@challenge/messaging';

import { DatabaseModule } from '../database/database.module';
import { PrismaPendingTransactionWriter } from './adapters/prisma-pending-transaction.writer';
import { PrismaTransactionReader } from './adapters/prisma-transaction.reader';
import { PrismaTransactionStatusStore } from './adapters/prisma-transaction-status.store';
import { TransactionStatusHandler } from './adapters/transaction-status.handler';
import { TransactionsController } from './adapters/transactions.controller';
import { ApplyTransactionResolution } from './application/apply-transaction-resolution';
import { CreateTransaction } from './application/create-transaction';
import { FindTransaction } from './application/find-transaction';
import { ListTransactions } from './application/list-transactions';

@Module({
  imports: [DatabaseModule],
  controllers: [TransactionsController, TransactionStatusHandler],
  providers: [
    PrismaPendingTransactionWriter,
    PrismaTransactionReader,
    PrismaTransactionStatusStore,
    {
      provide: ApplyTransactionResolution,
      useFactory: (transactions: PrismaTransactionStatusStore) =>
        new ApplyTransactionResolution(transactions),
      inject: [PrismaTransactionStatusStore],
    },
    {
      // A regra e uma classe pura, sem decorator: quem a monta e a fabrica, e nao o
      // container. Trocar o adaptador de banco nao encosta nela.
      provide: CreateTransaction,
      useFactory: (transactions: PrismaPendingTransactionWriter) =>
        new CreateTransaction(transactions, new SystemClock(), new RandomIdGenerator()),
      inject: [PrismaPendingTransactionWriter],
    },
    {
      provide: FindTransaction,
      useFactory: (transactions: PrismaTransactionReader) => new FindTransaction(transactions),
      inject: [PrismaTransactionReader],
    },
    {
      provide: ListTransactions,
      useFactory: (transactions: PrismaTransactionReader) => new ListTransactions(transactions),
      inject: [PrismaTransactionReader],
    },
  ],
})
export class TransactionsModule {}
