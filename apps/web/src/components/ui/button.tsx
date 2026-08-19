import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'critical';

/**
 * Variante e um mapa, e nao um encadeado de ternario no JSX: a lista de aparencias possiveis
 * fica visivel em cinco linhas, e o compilador cobra o dia em que uma nova entrar.
 */
const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-ink hover:bg-accent-hover disabled:bg-ink-subtle',
  secondary:
    'border border-line-strong bg-surface text-ink hover:bg-surface-muted disabled:text-ink-subtle disabled:hover:bg-surface',
  critical: 'bg-critical text-accent-ink hover:bg-critical-hover disabled:bg-ink-subtle',
};

const BASE =
  'control-height inline-flex items-center justify-center gap-2 rounded-control px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-accent-ring focus-visible:outline-none disabled:cursor-not-allowed';

/**
 * A aparencia do botao separada do elemento `button`. Existe porque uma navegacao continua
 * sendo um `<a>` — trocar por `button` custaria abrir em nova aba, copiar o endereco e o
 * menu de contexto — e mesmo assim precisa ser desenhada como acao primaria.
 */
export function buttonClassName(variant: ButtonVariant, className?: string): string {
  return cn(BASE, VARIANT[variant], className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

/**
 * `type` explicito com padrao `button`: o padrao do HTML e `submit`, e um botao de acao solto
 * dentro de formulario enviaria a busca sem querer.
 */
export function Button({
  variant = 'secondary',
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return <button type={type} className={buttonClassName(variant, className)} {...rest} />;
}
