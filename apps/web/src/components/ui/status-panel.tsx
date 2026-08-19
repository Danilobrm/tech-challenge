import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import type { Tone } from '@/lib/tone';

/** So dois tons: o painel serve estado neutro (carregando, vazio) e falha. */
type PanelTone = Extract<Tone, 'neutral' | 'critical'>;

const TONE: Record<PanelTone, string> = {
  neutral: '',
  critical: 'border-critical-line bg-critical-soft',
};

interface StatusPanelProps {
  /**
   * Papel ARIA opcional, porque nem todo painel precisa ser anunciado: quem avisa a espera e
   * a regiao viva permanente da tela. `alert` fica para a falha, que interrompe a leitura.
   */
  role?: 'alert';
  tone?: PanelTone;
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

/**
 * O mesmo bloco para carregando, erro e vazio. Sao tres estados irmaos: dar um desenho
 * proprio a cada um faria a tela parecer quebrada justamente quando nao ha dado nenhum para
 * ancorar o olho.
 */
export function StatusPanel({
  role,
  tone = 'neutral',
  icon,
  title,
  description,
  action,
}: StatusPanelProps) {
  return (
    <Card className={cn('px-6 py-14', TONE[tone])}>
      {/* Quando ha papel, ele fica no bloco inteiro e nao so no titulo: a mensagem e a acao
          fazem parte do que precisa ser anunciado. */}
      <div
        {...(role === undefined ? {} : { role })}
        className="flex flex-col items-center gap-3 text-center"
      >
        {icon}
        <p
          className={cn(
            'text-sm font-medium',
            tone === 'critical' ? 'text-critical-ink' : 'text-ink',
          )}
        >
          {title}
        </p>
        {description !== undefined && (
          <p className="max-w-md text-sm text-ink-muted">{description}</p>
        )}
        {action}
      </div>
    </Card>
  );
}
