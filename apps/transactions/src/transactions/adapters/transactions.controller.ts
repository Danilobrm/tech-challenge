import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { createTransactionSchema } from '@challenge/contracts';
import type { CreateTransactionInput } from '@challenge/contracts';

import { ZodValidationPipe } from '../../shared/zod-validation.pipe';
import { CreateTransaction } from '../application/create-transaction';
import { UnknownTransferTypeError } from '../domain/transaction';
import { toTransactionView } from './transaction.presenter';
import type { TransactionView } from './transaction.presenter';

/** Adaptador fino: valida o corpo, delega e traduz o erro de dominio para HTTP. */
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly createTransaction: CreateTransaction) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(createTransactionSchema)) body: CreateTransactionInput,
  ): Promise<TransactionView> {
    try {
      // Responde assim que a transacao esta gravada como pendente. A validacao da
      // antifraude acontece depois, fora do ciclo desta requisicao.
      return toTransactionView(await this.createTransaction.execute(body));
    } catch (error) {
      if (error instanceof UnknownTransferTypeError) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }
}
