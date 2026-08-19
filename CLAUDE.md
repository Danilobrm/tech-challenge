# Guia de trabalho — Desafio Técnico BIUD

Regras obrigatórias deste repositório. Valem para toda sessão.

## Contexto

Monorepo com dois serviços backend e um dashboard, comunicando por Kafka.

Uma transação financeira nasce com status `PENDING`, é validada de forma **assíncrona**
por um microserviço antifraude — valor **acima de** 1000 é rejeitado, 1000 exato é
aprovado — e tem o status atualizado depois, fora do ciclo de request do usuário.

`README.md` (o enunciado, que será substituído ao final) e `PRACTICES.md` são a fonte da
verdade sobre requisitos. Leia antes de propor qualquer mudança de rumo.

## Stack travada

Requisito do desafio. Não sugerir, propor nem instalar alternativa a nenhum destes itens.

| Camada     | Tecnologia                                      |
| ---------- | ----------------------------------------------- |
| Runtime    | Node.js 22                                      |
| Pacotes    | pnpm com workspaces, sem orquestrador           |
| Backend    | NestJS + TypeScript                             |
| ORM        | Prisma                                          |
| Banco      | PostgreSQL                                      |
| Mensageria | Kafka, via transporte de microserviço do NestJS |
| Frontend   | Next.js (App Router) + React + Tailwind         |
| Testes     | Vitest nos três apps                            |
| Validação  | Zod                                             |

## Decisões de arquitetura já tomadas

Não reabrir. Se algo aqui parecer errado, **aponte e pergunte** — não altere por conta própria.

1. Monorepo: `apps/transactions`, `apps/anti-fraud`, `apps/web`, `packages/contracts`.
2. **`anti-fraud` é stateless.** Não tem Prisma, não tem banco, não lê a tabela de
   transações. Recebe tudo o que precisa no payload do evento.
3. **`transactions` é o único dono do banco.**
4. Contratos de evento vivem em `packages/contracts`, com schema Zod, importados tanto por
   quem publica quanto por quem consome. A consistência do payload é garantida em tempo de
   compilação, não por convenção.
5. Envelope do evento: `eventId`, `eventType`, `version`, `occurredAt`, `correlationId`, `data`.
   `occurredAt` é a hora do fato no domínio, não a hora da publicação.
6. Chave de partição do Kafka: `transactionExternalId`. Garante ordenação por agregado.
7. **Outbox**: o evento é gravado na tabela `OutboxMessage` dentro da **mesma transação
   Prisma** do insert da transação. Um worker publica as pendentes e marca `publishedAt`.
   Resolve o dual write entre Postgres e Kafka.
8. **Idempotência em camadas**: `@@unique([transactionId, eventId])` no histórico faz a
   deduplicação no banco; a máquina de estados só permite transição a partir de `PENDING`;
   e a escrita é `UPDATE ... WHERE id = ? AND status = 'PENDING'` — compare-and-set atômico.
   **Nunca `SELECT` seguido de `UPDATE`.**
9. Atualização de status na interface: **polling condicional** — o refetch fica ativo
   apenas enquanto houver transação `PENDING` na tela.
10. **Sempre `@EventPattern` + `client.emit()`.** Nunca `@MessagePattern` nem
    `client.send()`: eles criam tópico `.reply` e tornam a criação síncrona, o que o
    enunciado proíbe explicitamente. Isso funciona sem dar erro — por isso é regra, não dica.

## Fluxo de git

- Trabalho **nunca** sai direto em `develop`. Sempre `git checkout -b <tipo>/<descricao-kebab-case>`
  a partir de `develop`.
- Tipos válidos, em branch e em commit: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`,
  `test`, `build`, `ci`, `chore`, `revert`.
- Commits em Conventional Commits, descrição no imperativo, sem acento, sem ponto final:
  - `feat(transactions): adiciona endpoint de criacao de transacao`
  - `fix(anti-fraud): corrige rejeicao no valor limite de 1000`
  - `test(web): cobre estado vazio da listagem`
- **Commits pequenos e incrementais.** Um comportamento por commit. O teste vai no mesmo
  commit do código que ele cobre — não num commit separado no final.
- **Nunca usar `--no-verify` ou `-n`.** Se um hook falhar, corrija a causa.

### Antes de criar branch ou commit, pergunte

Estas quatro paradas são obrigatórias. O histórico de commits é avaliado e vai ser
defendido oralmente — ele precisa passar pelo autor.

- Antes de `git checkout -b`: **proponha o nome da branch e espere confirmação.**
- Antes de cada `git commit`: **liste os arquivos que entram e mostre a mensagem proposta.
  Espere confirmação.** Nunca commite sem aprovação explícita.
- Se a mensagem precisar de "e" para descrever o que mudou, o commit deveria ser dois.
  Proponha a divisão em vez de commitar junto.
- Antes de abrir o PR: mostre o título e o corpo já preenchido do template.

- Integração em `develop` sempre por pull request, com `.github/pull_request_template.md`
  preenchido, checklist incluído. O PR descreve **o que mudou e por quê**, não o que o diff
  já mostra.

## Quality gate

`pnpm quality` roda lint, typecheck, format:check, test e build. Cada etapa também roda
isolada, para o ciclo curto.

- **Nenhuma tarefa está concluída sem `pnpm quality` verde.** Não anuncie conclusão antes.
- Não desabilitar regra de lint, não adicionar `eslint-disable`, não usar `@ts-ignore` e
  não afrouxar o `tsconfig` para o gate passar. Corrija o código.
- O workflow do GitHub Actions roda exatamente o mesmo comando. Se passa aqui, passa lá.

## Regras de código

- **TypeScript estrito. `any` é proibido.** Se o tipo não está claro, pergunte em vez de escapar.
- Configuração vem sempre do ambiente. Nada de host, porta, credencial ou broker fixo no código.
- Nomes explícitos: o nome diz o que a coisa faz, não como foi implementada.
- Arquivos focados. Arquivo grande costuma ser arquivo fazendo mais de uma coisa.
- Comentário explica **por quê**. O quê já está no código.
- **Caminho triste é funcionalidade.** Kafka fora do ar, banco indisponível e payload
  inválido precisam de tratamento explícito, não de `try/catch` vazio.
- Regra de negócio mora em classe pura, sem dependência de framework. O handler do Kafka e
  o controller HTTP são adaptadores finos: desserializam, validam, delegam, traduzem o erro.
- Valor monetário é `Decimal`, nunca `Float`.

### Frontend: onde cada arquivo mora

```
src/
├── app/          roteamento do Next. Nada além disso.
├── views/        uma tela por rota
├── components/
│   ├── ui/       primitivos do sistema de design, sem domínio
│   └── <assunto>/ componentes daquele assunto
├── hooks/        estado e efeito
└── lib/          código puro, sem React
```

- `src/app/` é roteamento e nada mais. `page.tsx` monta a view da rota e não passa de cinco
  linhas: sem regra, sem busca, sem estado. **Pasta `src/pages/` é proibida**: no Next ela é
  o roteador legado, todo arquivo dentro dela vira URL, e ligá-la junto do App Router quebra
  o build em rota coincidente.
- `src/views/<assunto>-view.tsx` é a tela inteira de uma rota. É quem conhece os três
  estados — carregando, erro e vazio — e orquestra os filhos.
- `src/components/<assunto>/` guarda os componentes daquele assunto, e `src/components/ui/`
  os primitivos do sistema de design. Um componente por arquivo, e o arquivo se chama como
  o componente, em kebab-case.
- `src/hooks/use-*.ts` guarda estado e efeito reaproveitáveis. Componente não chama a API
  direto: chama um hook.
- `src/lib/` é código puro, sem React — cliente HTTP, conversão, formatação. Se precisa de
  `useState`, não é `lib`.
- **Teste ao lado do arquivo que ele cobre**, mesmo nome com `.spec.ts(x)`. Nada de pasta
  `__tests__`. Componente sem `.spec` próprio só quando o spec da view que o compõe já
  exercita o comportamento dele.
- Import entre camadas usa o alias `@/`, nunca `../../`. Caminho relativo esconde a direção
  da dependência assim que o arquivo muda de pasta.
- Direção permitida: `app` → `views` → `components/<assunto>` → `components/ui` → `hooks` →
  `lib`. Nunca ao contrário: `lib` não importa componente, `hooks` não importa componente.

### Frontend: como criar um componente

- **Aparência vem de token, nunca de valor solto.** As cores, os raios e a altura de
  controle estão em `src/app/globals.css`, no bloco `@theme`. Componente escreve
  `bg-surface`, `text-ink-muted`, `rounded-control` — nunca `bg-white`, `text-zinc-600`,
  `rounded-lg` nem hex. Token que falta se adiciona no tema, não se contorna no arquivo.
- **Sem sombra.** A interface separa plano por borda de 1px (`border-line`) e por fundo
  (`bg-surface-muted`). Sombra empilha profundidade que esta tela não tem.
- **Nenhum controle com aparência padrão do sistema.** `<select>` leva `appearance-none` e
  seta desenhada; campo e botão têm a mesma altura, o mesmo raio e a mesma borda, para a
  linha de formulário alinhar sem ajuste manual.
- **O elemento nativo é inegociável.** Estiliza-se `button`, `select`, `input` e `table` —
  não se recria nenhum deles em `div`. É o elemento que entrega papel acessível, teclado e
  comportamento de toque; nada disso se paga com CSS depois.
- **Variante é um mapa `Record<Variante, string>`**, no topo do arquivo, e não um encadeado
  de ternário no meio do JSX. A lista de aparências possíveis fica visível, e o compilador
  cobra a entrada que faltar.
- **Primitivo de `ui/` não conhece domínio.** Ele recebe `tone`, `variant`, `label` — nunca
  `transaction` nem `status`. Quem traduz domínio para intenção é `lib/`, e o resultado é
  um `Tone`, não uma classe de cor.
- **Componente de assunto compõe primitivo, não redeclara estilo.** Se um componente de
  `<assunto>/` está escrevendo `border`, `rounded` e `px-`, o primitivo que falta é que
  deveria ter nascido.
- `className` é o último parâmetro do `cn()` e serve para **posição e tamanho** — margem,
  largura, `flex-1`. Não serve para repintar o primitivo.
- Todo controle tem estado de foco visível (`focus-visible:ring-*`) e estado desabilitado
  definido. Cor nunca é a única pista: o texto diz a mesma coisa que o tom.

## Testes

- Testar comportamento, não implementação.
- **Backend**: regras de negócio e tratamento dos eventos são o mínimo. Instanciar as
  classes diretamente (`new Service(fakeRepo, fakePublisher)`), sem `Test.createTestingModule`
  e sem subir Kafka ou Postgres.
- **Frontend**: telas principais e seus estados de carregamento, erro e vazio.
- Consultar a interface pelo **papel acessível (`getByRole`)** antes de recorrer a
  `data-testid`. Se o elemento não é alcançável por papel, o problema costuma estar na
  marcação, não no teste — corrija a marcação.
- Nenhum teste que entre no `pnpm quality` pode depender de serviço externo no ar.
- Não perseguir número de cobertura. Perseguir testes que quebram quando o comportamento quebra.

## DECISIONS.md

Toda decisão estruturante entra no `DECISIONS.md` **no mesmo PR em que foi tomada**, nunca
depois. Decisão reconstruída de memória no final tem cara de racionalização.

```markdown
## <Título da decisão>

**Decisão:** o que foi feito, em uma frase.

**Alternativas consideradas:** o que mais estava na mesa.

**Por quê:** o critério que decidiu, e sob que condição a escolha mudaria.
```

Uma decisão sem alternativa considerada não conta como decisão.
Escreva apenas o **rascunho em tópicos secos**: qual foi a decisão, quais alternativas
estavam na mesa, qual critério decidiu. **Não escreva a prosa final** — ela é reescrita à
mão pelo autor, porque esse texto vai ser defendido numa conversa e precisa estar na voz
de quem vai defendê-lo.

## Nunca fazer

- `git commit --no-verify`, commit direto em `develop`, `git push --force` em `develop`
- Commitar `.env`, `node_modules`, `dist`, `.next`, `coverage`
- Usar `any`, `@ts-ignore`, `eslint-disable`, ou afrouxar config para o gate passar
- Usar `@MessagePattern` ou `client.send()` no fluxo de eventos
- Fazer `SELECT` seguido de `UPDATE` para mudar status
- Dar Prisma, banco ou acesso à tabela de transações ao `anti-fraud`
- Instalar dependência nova sem avisar e justificar
- Criar arquivo de documentação não pedido (CHANGELOG, `docs/`, READMEs por pacote)
- Alterar `docker-compose.yml` sem registrar o porquê no `DECISIONS.md`
- Anunciar tarefa concluída sem `pnpm quality` verde
