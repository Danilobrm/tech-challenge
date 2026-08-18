/**
 * Erro de dominio, nao de infraestrutura: o `transferTypeId` veio do cliente, entao a
 * chave estrangeira quebrada e entrada invalida, e nao defeito do servico.
 */
export class UnknownTransferTypeError extends Error {
  constructor(readonly transferTypeId: number) {
    super(`Tipo de transferencia ${transferTypeId} nao existe`);
    this.name = 'UnknownTransferTypeError';
  }
}
