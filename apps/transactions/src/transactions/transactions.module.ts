import { Module } from '@nestjs/common';

import { RandomIdGenerator, SystemClock } from '@challenge/messaging';

import { DatabaseModule } from '../database/database.module';
import { PrismaPendingTransactionWriter } from './adapters/prisma-pending-transaction.writer';
import { PrismaTransactionStatusStore } from './adapters/prisma-transaction-status.store';
import { TransactionStatusHandler } from './adapters/transaction-status.handler';
import { TransactionsController } from './adapters/transactions.controller';
import { ApplyTransactionResolution } from './application/apply-transaction-resolution';
import { CreateTransaction } from './application/create-transaction';

@Module({
  imports: [DatabaseModule],
  controllers: [TransactionsController, TransactionStatusHandler],
  providers: [
    PrismaPendingTransactionWriter,
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
  ],
})
export class TransactionsModule {}
