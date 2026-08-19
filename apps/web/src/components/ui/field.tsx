import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

interface FieldProps {
  /** O mesmo id do controle: e o que liga rotulo e campo, para o clique e para o leitor de tela. */
  htmlFor: string;
  label: string;
  /** Texto do erro daquele campo. Ausente significa campo valido, nao erro escondido. */
  error?: string | undefined;
  className?: string;
  children: ReactNode;
}

/**
 * Id do paragrafo de erro, derivado do id do campo. Quem monta o controle aponta o
 * `aria-describedby` para ele — sem isso o leitor de tela le o rotulo e nao a razao da
 * recusa, e o campo fica marcado como invalido sem dizer por que.
 */
export function fieldErrorId(htmlFor: string): string {
  return `${htmlFor}-erro`;
}

/**
 * Rotulo, campo e erro sempre juntos, na mesma ordem e com o mesmo espaco. Enquanto o trio
 * nascer daqui, nao existe campo orfao de `<label>` nem erro solto longe do campo que o
 * causou.
 */
export function Field({ htmlFor, label, error, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-xs font-medium text-ink-muted">
        {label}
      </label>
      {children}
      {error !== undefined && (
        <p id={fieldErrorId(htmlFor)} className="text-xs text-critical-ink">
          {error}
        </p>
      )}
    </div>
  );
}
