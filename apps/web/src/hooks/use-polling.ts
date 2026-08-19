'use client';

import { useEffect, useRef } from 'react';

interface PollingOptions {
  /**
   * Enquanto for falso nenhum temporizador existe. E o que faz o polling ser condicional:
   * a tela liga quando ha algo por resolver e desliga sozinha quando nao ha mais.
   */
  active: boolean;
  intervalMs: number;
}

/**
 * Chama `tick` de tempos em tempos enquanto estiver ativo.
 *
 * O retorno de chamada fica numa referencia, e nao na lista de dependencias: ele muda de
 * identidade a cada render de quem chama, e reiniciar o intervalo a cada render adiaria a
 * proxima volta para sempre.
 */
export function usePolling(tick: () => void, { active, intervalMs }: PollingOptions): void {
  const tickRef = useRef(tick);

  useEffect(() => {
    tickRef.current = tick;
  });

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const timer = setInterval(() => {
      tickRef.current();
    }, intervalMs);

    return () => {
      clearInterval(timer);
    };
  }, [active, intervalMs]);
}
