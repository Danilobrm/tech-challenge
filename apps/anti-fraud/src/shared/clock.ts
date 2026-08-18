/** Injetado para o teste conseguir prever o `occurredAt` do evento publicado. */
export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
