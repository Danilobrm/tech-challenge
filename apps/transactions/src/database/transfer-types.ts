/**
 * Catalogo fechado de tipos de transferencia. Os ids sao estaveis e fazem parte do contrato
 * publico: o cliente manda `transferTypeId` no corpo da criacao. Por isso vivem aqui, no
 * codigo, e nao numa sequence do banco.
 */
export const TRANSFER_TYPES: ReadonlyArray<{ id: number; name: string }> = [
  { id: 1, name: 'Transferência entre contas' },
  { id: 2, name: 'Pagamento' },
  { id: 3, name: 'Depósito' },
];
