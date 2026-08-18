import { compareMonetaryAmounts } from '@challenge/contracts';
import type {
  MonetaryAmount,
  TransactionResolution,
  TransactionResolutionReason,
} from '@challenge/contracts';

/**
 * Limite do desafio: acima de 1000 rejeita, 1000 exato aprova. A fronteira e `>`, nao
 * `>=` — e a diferenca entre as duas nao aparece em nenhum teste que nao use o valor
 * exato do limite.
 */
export const FRAUD_VALUE_LIMIT: MonetaryAmount = '1000.00';

export interface FraudDecision {
  status: TransactionResolution;
  reason: TransactionResolutionReason;
}

/** Regra pura: entra valor, sai decisao. Nao conhece Nest, Kafka nem evento. */
export class TransactionFraudRule {
  constructor(private readonly limit: MonetaryAmount = FRAUD_VALUE_LIMIT) {}

  evaluate(value: MonetaryAmount): FraudDecision {
    if (compareMonetaryAmounts(value, this.limit) > 0) {
      return { status: 'REJECTED', reason: 'value_above_limit' };
    }

    return { status: 'APPROVED', reason: 'value_within_limit' };
  }
}
