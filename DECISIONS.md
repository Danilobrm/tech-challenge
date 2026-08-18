# Decisões de arquitetura

Registro das decisões estruturantes do projeto. Cada entrada é escrita no mesmo PR em que a
decisão foi tomada.

---

## Monorepo com pnpm workspaces, sem orquestrador de build

**Decisão:** um único repositório com `apps/*` e `packages/*` em pnpm workspaces; o quality
gate é encadeamento de scripts npm (`pnpm -r --if-present <script>`), sem Turborepo nem Nx.

**Alternativas consideradas:**

- repositórios separados por serviço, com o contrato publicado como pacote versionado
- monorepo com Turborepo (cache local e remoto, grafo de tarefas, execução paralela)
- monorepo com Nx (geradores, grafo de dependências, cache distribuído)

**Por quê:**

- o contrato de evento é compartilhado entre publicador e consumidor; em repositórios
  separados cada mudança de payload vira ciclo de publish/bump/install e a divergência só
  aparece em runtime — no monorepo ela é erro de compilação
- quatro pacotes e um único job de CI não geram tempo de build que justifique cache de
  tarefas; o orquestrador seria configuração a defender sem ganho mensurável
- muda se: número de pacotes crescer a ponto do gate passar de poucos minutos, ou se o CI
  precisar rodar só o afetado pelo diff — aí Turborepo entra primeiro, por ser aditivo (não
  substitui os scripts, envelopa)

---

## Vitest como runner único de testes nos três apps

**Decisão:** Vitest em `transactions`, `anti-fraud` e `web`, com a mesma configuração base.

**Alternativas consideradas:**

- Jest nos dois backends (padrão que o `nest new` gera) e Vitest no front
- Jest em todos os três
- node:test nativo nos backends

**Por quê:**

- runner único = uma configuração, um relatório, um comando no gate; dois runners
  significariam dois conjuntos de transform/mock/config para manter alinhados
- o `web` (Next + React) tem caminho de menor atrito com Vitest + Testing Library; forçar
  Jest lá custaria configuração de transform que o Vite já resolve
- os testes exigidos são de classe pura instanciada na mão e de componente com fetch
  mockado — nenhum depende de recurso exclusivo do Jest
- muda se: aparecer dependência de algum ecossistema só-Jest (ex.: preset oficial que não
  tenha equivalente), o que hoje não é o caso

---

## Kafka pelo transporte de microserviço do NestJS

**Decisão:** usar `@nestjs/microservices` com o transporte Kafka (`@EventPattern` +
`client.emit()`), em vez de consumir a `kafkajs` diretamente.

**Alternativas consideradas:**

- `kafkajs` puro, com produtor e consumidor escritos à mão e registrados no ciclo de vida
  do Nest
- transporte do Nest, porém com `@MessagePattern` + `client.send()`

**Por quê:**

- o transporte já resolve ciclo de vida (conexão no boot, desconexão no shutdown),
  serialização e roteamento por padrão de evento; escrever isso à mão é reimplementar o
  adaptador sem ganho de controle nesta escala
- `send()` é request/reply: cria tópico `.reply`, e a criação da transação passaria a
  esperar a resposta do antifraude — exatamente o que o enunciado proíbe. `emit()` é
  fire-and-forget, que é a semântica do fluxo
- o transporte é fino o bastante para não vazar para o domínio: a regra de negócio fica em
  classe pura e o handler é adaptador
- muda se: for preciso controle fino de offset, `pause`/`resume` para backpressure ou
  estratégia própria de commit — aí o consumidor cru da `kafkajs` volta à mesa

---

## Esqueletos dos serviços Nest escritos à mão, sem `nest new`

**Decisão:** os arquivos de `apps/transactions` e `apps/anti-fraud` (package.json,
tsconfig, nest-cli.json, módulo e controller) foram escritos à mão, e cada app estende o
`tsconfig.base.json` da raiz.

**Alternativas consideradas:**

- `nest new` em cada app, ajustando depois o que sobrasse
- `nest new` em um app e cópia manual para o outro

**Por quê:**

- o `nest new` gera projeto standalone: ESLint, Prettier, `tsconfig` e Jest próprios — três
  deles já existem na raiz, e o quarto é runner que o projeto decidiu não usar
- limpar o que ele gera dá mais trabalho e deixa mais resíduo do que escrever os cinco
  arquivos que de fato são necessários
- o `apps/web` é o caso oposto: o `create-next-app` gera estrutura que o Next espera
  (`next-env.d.ts`, `postcss.config.mjs`, App Router), e ali o resíduo se resume à config de
  ESLint e ao README

---

## Um único `.env`, na raiz, validado com Zod no boot

**Decisão:** existe um `.env` só, na raiz do repositório, criado com `cp .env.example .env`.
Os dois apps Nest o carregam com `ConfigModule.forRoot({ envFilePath: '../../.env' })` e
validam as variáveis obrigatórias com Zod; o `apps/web` carrega o mesmo arquivo no
`next.config.ts` via `dotenv`, porque o Next só lê `.env` do diretório do próprio app.

**Alternativas consideradas:**

- um `.env` por app, cada um com o seu subconjunto
- `.env` na raiz mais `.env` por app sobrescrevendo o que for específico

**Por quê:**

- o enunciado manda subir o projeto com um único `cp .env.example .env`; múltiplos arquivos
  quebrariam esse passo ou exigiriam explicação no README
- `DATABASE_URL` e `KAFKA_BROKERS` são os mesmos para quem publica e para quem consome —
  duplicá-los cria a chance de divergirem em silêncio
- validar com Zod no boot faz faltar variável virar erro na subida, com o nome do que
  faltou, em vez de `undefined` chegando no cliente do Kafka
- cada app valida só o que consome: o `anti-fraud` é stateless e não exige `DATABASE_URL`
- muda se: os serviços forem para deploys independentes, onde cada um recebe o próprio
  conjunto de variáveis do orquestrador — aí o arquivo único é substituído por variáveis de
  ambiente injetadas, e o schema Zod continua valendo sem alteração

---

## Ordem do quality gate: `build` antes de `typecheck`

**Decisão:** `pnpm quality` roda `lint`, `build`, `typecheck`, `format:check` e `test`,
nessa ordem.

**Alternativas consideradas:**

- manter `typecheck` antes de `build`, e gerar os tipos faltantes em algum passo anterior
- referências de projeto do TypeScript (`composite` + `tsc -b`) entre os pacotes

**Por quê:**

- `packages/contracts` é consumido pelos apps através do seu `dist`, e o `apps/web` só tem
  os tipos de rota do Next (`.next/types`) depois de um build — checar tipos antes de
  construir falharia por artefato ausente, não por erro de tipo
- referências de projeto resolveriam a ordem de forma declarativa, mas exigem `composite`
  em todos os pacotes e não cobrem os tipos gerados pelo Next
- o custo é baixo: o `build` é incremental e o `typecheck` seguinte reaproveita o mesmo
  `tsconfig`

---

## Dois comandos para subir o projeto: `pnpm setup` e `pnpm dev`

**Decisão:** a raiz expõe `setup` (instala, constrói `contracts` e roda migration e seed) e
`dev` (`pnpm -r --parallel dev`, que sobe os três apps em um processo só).

**Alternativas consideradas:**

- documentar no README os comandos por app, um terminal para cada
- Turborepo ou concurrently orquestrando os processos de desenvolvimento
- incluir `docker compose up -d --wait` dentro do `setup`

**Por quê:**

- quem clona precisa conseguir subir tudo sem descobrir a ordem certa; três terminais e
  quatro comandos são três chances de errar a ordem
- `pnpm -r --parallel` já entrega o que `concurrently` daria, sem dependência nova, e prefixa
  a saída com o nome do pacote
- `docker compose` ficou fora do `setup` de propósito: subir container é passo com efeito na
  máquina de quem avalia, e mistura infraestrutura com preparação do código — ele continua
  explícito no README, antes do `setup`
- `setup` constrói o `contracts` porque os apps o consomem pelo `dist`; sem isso o `dev`
  falharia na resolução do import num clone zerado
