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
