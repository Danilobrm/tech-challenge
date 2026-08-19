/**
 * Vocabulario de intencao da interface. Mora em `lib` porque quem traduz dominio para tom —
 * "rejeitada e critica" — nao pode depender de componente, e o componente e quem decide como
 * um tom vira cor.
 */
export type Tone = 'neutral' | 'positive' | 'attention' | 'critical';
