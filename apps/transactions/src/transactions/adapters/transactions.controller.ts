import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import { createTransactionSchema, listTransactionsQuerySchema } from '@challenge/contracts';
import type {
  CreateTransactionInput,
  ListTransactionsQuery,
  ListTransactionsResponse,
  TransactionView,
} from '@challenge/contracts';

import { ZodValidationPipe } from '../../shared/zod-validation.pipe';
import { CreateTransaction } from '../application/create-transaction';
import { FindTransaction } from '../application/find-transaction';
import { ListTransactions } from '../application/list-transactions';
import { TransactionNotFoundError, UnknownTransferTypeError } from '../domain/transaction';
import { toTransactionListView, toTransactionView } from './transaction.presenter';

/** Adaptador fino: valida a entrada, delega e traduz o erro de dominio para HTTP. */
@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly createTransaction: CreateTransaction,
    private readonly findTransaction: FindTransaction,
    private readonly listTransactions: ListTransactions,
  ) {}

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

  @Get()
  async list(
    @Query(new ZodValidationPipe(listTransactionsQuerySchema)) query: ListTransactionsQuery,
  ): Promise<ListTransactionsResponse> {
    return toTransactionListView(await this.listTransactions.execute(query));
  }

  /**
   * O identificador externo e o uuid da linha. Valida-lo separa "id malformado", que e
   * erro do cliente, de "id valido que nao existe", que e 404 — e evita que o texto solto
   * chegue ate a coluna `uuid` do Postgres e volte como erro de infraestrutura.
   */
  @Get(':transactionExternalId')
  async findOne(
    @Param('transactionExternalId', new ZodValidationPipe(z.uuid()))
    transactionExternalId: string,
  ): Promise<TransactionView> {
    try {
      return toTransactionView(await this.findTransaction.execute(transactionExternalId));
    } catch (error) {
      if (error instanceof TransactionNotFoundError) {
        throw new NotFoundException(error.message);
      }

      throw error;
    }
  }
}
