/**
 * Catalogo fechado de tipos de transferencia. Os ids sao estaveis e fazem parte do contrato
 * publico: o cliente manda `transferTypeId` no corpo da criacao e no filtro da listagem.
 * Por isso vivem no codigo, e nao numa sequence do banco.
 *
 * Mora nos contratos porque tem dois leitores: o seed, que popula a tabela, e o filtro do
 * dashboard, que precisa do nome para exibir. Duplicar a lista faria o dashboard esconder
 * um tipo novo sem que ninguem percebesse.
 */
export const TRANSFER_TYPES: ReadonlyArray<{ id: number; name: string }> = [
  { id: 1, name: 'Transferência entre contas' },
  { id: 2, name: 'Pagamento' },
  { id: 3, name: 'Depósito' },
];
