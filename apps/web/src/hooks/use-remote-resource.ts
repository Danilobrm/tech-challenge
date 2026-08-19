'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Os tres estados de uma leitura como tres formas distintas, e nao como tres booleanos
 * soltos. `carregando && erro` deixa de ser representavel, entao a tela nao tem como cair
 * no meio termo de mostrar a espera e a falha ao mesmo tempo.
 *
 * `refreshing` mora dentro de `ready` porque uma busca com resultado ja na tela nao e o
 * mesmo estado da primeira: desmontar o conteudo para remontar logo em seguida tiraria o
 * foco do teclado do botao que acabou de ser clicado.
 *
 * A falha e generica de proposito. A listagem so precisa de uma frase; o detalhe precisa
 * separar "nao existe" de "deu errado", porque um 404 nao ganha botao de tentar de novo.
 */
export type RemoteResourceState<TData, TFailure> =
  | { kind: 'loading' }
  | { kind: 'error'; failure: TFailure }
  | { kind: 'ready'; data: TData; refreshing: boolean };

/**
 * Quantas voltas silenciosas seguidas podem falhar antes de a tela assumir a falha. Uma so
 * costuma ser uma oscilacao de rede que a volta seguinte resolve; tres seguidas sao a API
 * fora do ar, e continuar mostrando o dado antigo sem aviso seria mentir para quem le.
 */
const QUIET_FAILURES_UNTIL_VISIBLE = 3;

export interface RemoteResource<TData, TFailure> {
  state: RemoteResourceState<TData, TFailure>;
  /** Refaz a leitura mostrando a espera. E a acao do botao de tentar novamente. */
  reload: () => void;
  /**
   * Refaz a leitura sem anunciar nada. E o que o ciclo de polling usa: marcar `aria-busy` a
   * cada volta faria a tela piscar sozinha, e um ciclo que falha nao pode trocar o conteudo
   * que ja esta na tela por um painel de erro — a proxima volta tenta de novo.
   */
  refreshQuietly: () => void;
}

/**
 * O ciclo de uma leitura remota: primeira carga, recarga pedida pelo usuario e recarga
 * silenciosa, com cancelamento no desmonte.
 *
 * `read` e `describeFailure` precisam ter identidade estavel — `useCallback` no chamador,
 * ou funcao de modulo. Uma funcao nova a cada render reiniciaria a busca em laco.
 */
export function useRemoteResource<TData, TFailure>(
  read: (signal: AbortSignal) => Promise<TData>,
  describeFailure: (error: unknown) => TFailure,
): RemoteResource<TData, TFailure> {
  const [state, setState] = useState<RemoteResourceState<TData, TFailure>>({ kind: 'loading' });
  // Contador, e nao booleano: duas tentativas seguidas precisam ser dois valores diferentes
  // para o efeito rodar de novo.
  const [attempt, setAttempt] = useState(0);

  // A recarga silenciosa e montada dentro do efeito, para compartilhar o mesmo
  // `AbortController` da busca corrente: o desmonte cancela as duas de uma vez.
  const refreshRef = useRef<() => void>(() => {});

  const reload = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  const refreshQuietly = useCallback(() => {
    refreshRef.current();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    let reading = false;
    let consecutiveQuietFailures = 0;

    function run(quiet: boolean): void {
      // Uma volta do polling que chega com a anterior ainda no ar seria uma corrida: as duas
      // escrevem no mesmo estado, e quem resolve por ultimo vence — nao quem perguntou por
      // ultimo. Uma resposta lenta poderia devolver "pendente" depois de "aprovada".
      if (quiet && reading) {
        return;
      }

      reading = true;

      if (!quiet) {
        setState((current) =>
          current.kind === 'ready' ? { ...current, refreshing: true } : { kind: 'loading' },
        );
      }

      read(controller.signal)
        .then((data) => {
          reading = false;
          consecutiveQuietFailures = 0;

          if (!disposed) {
            setState({ kind: 'ready', data, refreshing: false });
          }
        })
        .catch((error: unknown) => {
          reading = false;

          // Resposta de uma leitura que a tela ja descartou — trocou o filtro, ou saiu da
          // rota, antes de ela chegar. Escreve-la no estado sobreporia a leitura corrente.
          if (disposed) {
            return;
          }

          if (quiet) {
            consecutiveQuietFailures += 1;

            // Uma volta que falha nao derruba a tela: a proxima tenta de novo. Varias
            // seguidas nao sao mais um tropeco — e o dado na tela envelhecendo em silencio,
            // com o usuario achando que esta vendo o status atual.
            if (consecutiveQuietFailures >= QUIET_FAILURES_UNTIL_VISIBLE) {
              setState({ kind: 'error', failure: describeFailure(error) });
            }

            return;
          }

          setState({ kind: 'error', failure: describeFailure(error) });
        });
    }

    refreshRef.current = () => {
      run(true);
    };

    run(false);

    return () => {
      disposed = true;
      controller.abort();
      refreshRef.current = () => {};
    };
  }, [read, describeFailure, attempt]);

  return { state, reload, refreshQuietly };
}
