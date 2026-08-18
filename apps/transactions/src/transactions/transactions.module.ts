import { Module } from '@nestjs/common';

import { RandomIdGenerator, SystemClock } from '@challenge/messaging';

import { DatabaseModule } from '../database/database.module';
import { ApplyTransactionResolution } from './apply-transaction-resolution.service';
import { CreateTransaction } from './create-transaction.service';
import { PrismaPendingTransactionWriter } from './prisma-pending-transaction.writer';
import { PrismaTransactionStatusStore } from './prisma-transaction-status.store';
import { TransactionStatusHandler } from './transaction-status.handler';
import { TransactionsController } from './transactions.controller';

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
