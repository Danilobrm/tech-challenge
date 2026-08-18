import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { SystemClock } from '../shared/clock';
import { RandomIdGenerator } from '../shared/id-generator';
import { CreateTransaction } from './create-transaction.service';
import { PrismaPendingTransactionWriter } from './prisma-pending-transaction.writer';
import { TransactionsController } from './transactions.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [TransactionsController],
  providers: [
    PrismaPendingTransactionWriter,
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
