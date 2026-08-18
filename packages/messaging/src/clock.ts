/**
 * Hora do fato, carimbada em todo evento publicado. E dependencia, e nao chamada direta a
 * `new Date()`, porque congelar o tempo e a unica forma de um teste afirmar o que foi
 * gravado no `occurredAt`.
 */
export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
