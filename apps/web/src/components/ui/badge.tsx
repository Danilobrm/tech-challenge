import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import type { Tone } from '@/lib/tone';

const TONE: Record<Tone, string> = {
  neutral: 'bg-surface-muted text-ink-muted ring-line',
  positive: 'bg-positive-soft text-positive-ink ring-positive-line',
  attention: 'bg-attention-soft text-attention-ink ring-attention-line',
  critical: 'bg-critical-soft text-critical-ink ring-critical-line',
};

/**
 * O tom acompanha o texto, nunca o substitui: quem nao distingue as cores le a palavra e
 * chega na mesma conclusao.
 */
export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONE[tone],
      )}
    >
      {children}
    </span>
  );
}
