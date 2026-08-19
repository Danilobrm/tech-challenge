import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * Ligacao dentro de texto ou de celula de tabela. Sublinhado apenas no hover, mas com anel
 * de foco sempre: quem navega por teclado precisa enxergar onde esta.
 */
export function InlineLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'rounded-control text-accent underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-accent-ring focus-visible:outline-none',
        className,
      )}
    >
      {children}
    </Link>
  );
}
