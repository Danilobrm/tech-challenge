import type { SelectHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

const CONTROL =
  'control-height w-full appearance-none rounded-control border border-line-strong bg-surface pl-3 pr-9 text-sm text-ink transition-colors hover:border-ink-subtle focus:border-accent focus:ring-2 focus:ring-accent-ring focus:outline-none aria-invalid:border-critical disabled:bg-surface-muted disabled:text-ink-subtle';

/**
 * `<select>` de verdade, com a aparencia do sistema desligada por `appearance-none` e a seta
 * desenhada aqui.
 *
 * A alternativa — lista aberta em JavaScript — daria controle total do visual e custaria o
 * que o elemento nativo entrega pronto: papel `combobox`, navegacao por teclado, busca por
 * digitacao e o seletor nativo no celular. Aparencia nao vale esse preco.
 */
export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(CONTROL, className)} {...rest}>
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-subtle"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 8.5 10 12.5 14 8.5" />
      </svg>
    </div>
  );
}
