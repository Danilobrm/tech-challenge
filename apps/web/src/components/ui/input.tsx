import type { InputHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

const CONTROL =
  'control-height w-full rounded-control border border-line-strong bg-surface px-3 text-sm text-ink transition-colors hover:border-ink-subtle focus:border-accent focus:ring-2 focus:ring-accent-ring focus:outline-none aria-invalid:border-critical disabled:bg-surface-muted disabled:text-ink-subtle';

/**
 * Mesma altura, mesmo raio e mesma borda do `Select`. E o que faz uma linha de filtros com
 * tipos diferentes de campo terminar alinhada sem ajuste manual em cada um.
 */
export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL, className)} {...rest} />;
}
