import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * Superficie da interface: borda de 1px e raio, sem sombra. Profundidade por sombra empilha
 * planos que a tela nao tem — aqui tudo esta no mesmo nivel, e o traco basta para separar.
 */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-surface border border-line bg-surface', className)}>{children}</div>
  );
}
