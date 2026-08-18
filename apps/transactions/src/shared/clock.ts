/**
 * O relogio e uma dependencia porque a hora do fato entra no evento e no banco: em teste,
 * congelar o tempo e a unica forma de afirmar que os dois recebem o mesmo instante.
 */
export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
