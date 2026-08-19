import Link from 'next/link';
import type { ReactNode } from 'react';

import { buttonClassName } from '@/components/ui/button';
import type { ButtonVariant } from '@/components/ui/button';

interface ActionLinkProps {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
}

/**
 * Navegacao com aparencia de botao. E um `<a>` de verdade: abrir em nova aba, copiar o
 * endereco e o menu de contexto sao comportamentos do elemento, e um `button` com
 * `router.push` dentro perderia os tres sem avisar ninguem.
 */
export function ActionLink({ href, variant = 'secondary', className, children }: ActionLinkProps) {
  return (
    <Link href={href} className={buttonClassName(variant, className)}>
      {children}
    </Link>
  );
}
