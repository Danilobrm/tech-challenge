import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';

/**
 * Aviso curto no fluxo da pagina, para o que precisa interromper a leitura: uma recusa do
 * formulario, uma falha do envio. O painel cheio (`StatusPanel`) fica para quando nao ha
 * conteudo nenhum na tela — aqui o conteudo continua la, e so ganhou um problema em cima.
 */
export function Alert({ children }: { children: ReactNode }) {
  return (
    <Card className="border-critical-line bg-critical-soft px-4 py-3">
      <p role="alert" className="text-sm text-critical-ink">
        {children}
      </p>
    </Card>
  );
}
