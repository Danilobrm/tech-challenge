import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

interface FieldProps {
  /** O mesmo id do controle: e o que liga rotulo e campo, para o clique e para o leitor de tela. */
  htmlFor: string;
  label: string;
  className?: string;
  children: ReactNode;
}

/**
 * Rotulo e campo sempre juntos, na mesma ordem e com o mesmo espaco. Enquanto o par nascer
 * daqui, nao existe campo orfao de `<label>` na tela.
 */
export function Field({ htmlFor, label, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-xs font-medium text-ink-muted">
        {label}
      </label>
      {children}
    </div>
  );
}
