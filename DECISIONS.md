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

---

## Status corrente na tabela da transação, mais log append-only das transições

**Decisão:** `Transaction.status` guarda o estado corrente denormalizado, e
`TransactionStatusHistory` guarda uma linha por transição, append-only, com `fromStatus`,
`toStatus`, `reason`, `eventId`, `metadata` e `occurredAt`. Nem só o campo, nem só o log.

**Alternativas consideradas:**

- só a coluna `status`, sem histórico — o mais simples que atende o contrato do enunciado
- event sourcing puro: o log de eventos é a fonte da verdade e o status é derivado por
  replay, com projeção de leitura reconstruída a partir dele
- tabela de histórico com update na linha corrente (`valid_from` / `valid_to`) em vez de
  append-only

**Por quê:**

- a leitura dominante do sistema é "qual o status desta transação" e "liste as pendentes":
  com o campo denormalizado é um índice `[status, createdAt]`; com replay seria agregação
  por transação a cada consulta
- o histórico não é enfeite — é o que dá auditoria da decisão do antifraude (`reason`,
  `metadata`) e é onde mora o `@@unique([transactionId, eventId])` que deduplica reentrega
  do Kafka; sem ele, a idempotência teria que virar tabela separada de eventos processados
- event sourcing puro cobraria projeções, versionamento de evento e replay para um domínio
  de três estados e uma transição possível: custo de infraestrutura sem ganho de modelo
- append-only mantém a tabela livre de update e delete, então concorrência no histórico se
  resolve por insert e constraint, não por lock
- a escolha mudaria se o domínio ganhasse muitos estados, correção retroativa de eventos ou
  exigência regulatória de reconstruir o estado em qualquer instante do passado — aí o log
  vira fonte da verdade e o campo vira projeção mantida por um projetor

## Valor monetário em `Decimal(18,2)`, nunca `Float`

**Decisão:** `Transaction.value` é `Decimal @db.Decimal(18, 2)`, mapeado para `NUMERIC(18,2)`
no Postgres.

**Alternativas consideradas:**

- `Float` (`DOUBLE PRECISION`), que é o tipo mais direto para um campo numérico
- inteiro em centavos (`BigInt`), evitando decimal no banco e na aplicação

**Por quê:**

- `Float` é binário IEEE-754: `0.1 + 0.2` não dá `0.3`, e soma de valores acumula erro que
  aparece em relatório e conciliação — para dinheiro isso é defeito, não arredondamento
- a regra do desafio é uma comparação de fronteira (`value > 1000` rejeita, `1000` exato
  aprova); com binário de ponto flutuante o valor limite depende de como o número foi
  parseado, e o teste do limite exato vira loteria
- `NUMERIC` é decimal exato no Postgres, e o Prisma devolve `Decimal` no client, o que
  impede que o valor vire `number` de JavaScript por descuido no caminho
- centavos em inteiro também seria exato, mas empurra a conversão para toda borda de entrada
  e saída (API, evento Kafka, tela) e cria uma classe nova de bug: esquecer de dividir
- `18,2` cobre valor com 16 dígitos inteiros; mudaria se o domínio passasse a exigir mais
  casas decimais, como câmbio ou juros intradiários

## Nomes `snake_case` no banco, `camelCase` no client, via `@map`

**Decisão:** cada modelo e campo tem `@@map` / `@map` para `snake_case`; o schema Prisma
segue `camelCase` e é o que a aplicação enxerga.

**Alternativas consideradas:**

- deixar o padrão do Prisma, com tabela `Transaction` e coluna `accountExternalIdDebit`
- `snake_case` também no schema Prisma, alinhando os dois lados pelo banco

**Por quê:**

- identificador com maiúscula no Postgres só sobrevive entre aspas: `select * from
Transaction` falha, e todo SQL manual — psql, dump, plano de execução — vira campo minado
- a aplicação é TypeScript e `camelCase` é o que o resto do código já usa; alinhar o schema
  ao banco contaminaria o código de aplicação com a convenção do armazenamento
- o custo é uma linha por campo, escrita uma vez e verificada pela migration

## Client do Prisma gerado no `postinstall`, não versionado

**Decisão:** o generator `prisma-client` emite em `apps/transactions/src/generated/prisma`,
o diretório está no `.gitignore`, e `postinstall` do pacote roda `prisma generate`.

**Alternativas consideradas:**

- versionar o client gerado, para o clone typechecar sem passo extra
- rodar `prisma generate` dentro dos scripts `build` e `typecheck`
- deixar o `generate` só no README, como passo manual antes do primeiro build

**Por quê:**

- o Prisma 7 emite TypeScript num diretório do projeto, não mais dentro de `node_modules`:
  são ~360 KB de código gerado que entrariam em todo diff e todo conflito de merge
- sem gerar, `typecheck` e `build` quebram num clone limpo, então o passo não pode ser
  manual — em CI ele tem que acontecer sozinho
- `postinstall` roda uma vez por install; embutir no `build` e no `typecheck` custaria a
  geração duas vezes a cada `pnpm quality`
- o diretório entrou no ignore do ESLint e do Prettier pelo mesmo motivo: artefato gerado
  não é código nosso para lintar ou formatar

## Outbox: o evento entra na mesma transação do agregado

**Decisão:** o `POST /transactions` grava a `Transaction` e a linha da `OutboxMessage` numa
única transação Prisma. Um worker com `@Interval` varre as pendentes, publica no Kafka e
marca `publishedAt`.

**Alternativas consideradas:**

- publicar direto no Kafka logo após o commit do insert
- publicar dentro da transação, antes do commit
- CDC lendo o WAL do Postgres (Debezium) em vez de tabela de outbox

**Por quê:**

- gravar no banco e publicar no broker são duas escritas em dois sistemas sem transação
  comum — é o dual write. Cair entre elas deixa transação que nunca será validada
  (commit sem publish) ou evento sobre agregado que não existe (publish sem commit), e
  nenhum dos dois estados é detectável depois
- publicar antes do commit é pior: o rollback não desfaz a mensagem, e o antifraude passa
  a responder sobre uma transação que nunca existiu
- com a outbox só existe uma escrita transacional; a publicação vira um efeito derivado,
  reexecutável, com a tabela como fila durável
- o preço é entrega ao menos uma vez: cair entre o `publish` e o `markPublished` republica
  no ciclo seguinte. É aceito de propósito, e tratado por deduplicação no consumidor
- CDC eliminaria o worker e a tabela, mas acrescenta Debezium, Kafka Connect e um contrato
  acoplado ao schema físico das tabelas — infraestrutura demais para dois eventos
- muda se: o volume tornar o polling caro. O primeiro passo seria `FOR UPDATE SKIP LOCKED`
  para permitir mais de uma instância do worker; CDC só depois disso

## Idempotência em camadas, no banco e não no consumidor

**Decisão:** três mecanismos empilhados no consumo de `transaction.status.updated`, todos
dentro de uma transação: `@@unique([transactionId, eventId])` no histórico (com
`skipDuplicates`, que vira `ON CONFLICT DO NOTHING`), a máquina de estados que só sai de
`PENDING`, e `UPDATE ... WHERE id = ? AND status = 'PENDING'` como compare-and-set.

**Alternativas consideradas:**

- tabela dedicada de eventos processados, consultada antes de aplicar
- `SELECT` da transação, decidir em memória, depois `UPDATE`
- lock pessimista (`SELECT ... FOR UPDATE`) na linha da transação
- cache de `eventId` já vistos em memória ou Redis

**Por quê:**

- cada camada cobre uma falha diferente: o unique cobre reentrega da mesma mensagem, o
  compare-and-set cobre corrida entre consumidores, e a máquina de estados cobre evento
  fora de ordem — nenhuma delas cobre as três sozinha
- `SELECT` seguido de `UPDATE` tem uma janela entre a leitura e a escrita; com duas
  instâncias consumindo, as duas leem `PENDING` e a segunda sobrescreve a decisão da
  primeira. O compare-and-set fecha a janela dentro do próprio `UPDATE`
- lock pessimista também resolveria, ao custo de segurar a linha até o fim da transação;
  a contenção é desnecessária quando a escrita já é condicional
- deduplicação em memória ou Redis é aproximada: reinício perde o estado e a fonte da
  verdade passa a ser um sistema diferente do que guarda o dado
- tabela separada de eventos processados seria uma escrita a mais para dizer o que o
  histórico, que já é append-only, diz de graça
- muda se: aparecerem transições além do par pendente → final. Aí a máquina de estados
  deixa de caber no `WHERE` e vira código explícito antes da escrita

## Chave de partição: `transactionExternalId`

**Decisão:** todo evento é publicado com o id da transação como chave, e os tópicos são
criados com três partições.

**Alternativas consideradas:**

- sem chave (round-robin entre as partições)
- `accountExternalIdDebit` como chave, agrupando por conta
- tópico com uma partição só, garantindo ordem global

**Por quê:**

- o Kafka só garante ordem dentro da partição. A chave é o que amarra todos os eventos de
  uma transação à mesma partição, e portanto ao mesmo consumidor, em ordem
- sem chave, criação e resultado da mesma transação podem cair em partições diferentes e
  ser processados fora de ordem; a idempotência salvaria a consistência, mas por acidente
- chave por conta daria ordem por conta e concentraria carga: conta movimentada vira
  partição quente, e o paralelismo do consumidor fica limitado pela conta mais ativa
- uma partição só daria ordem global ao custo de teto de paralelismo igual a um — é o
  oposto do que a partição existe para resolver
- três partições no compose local são arbitrárias, e é esse o ponto: com uma só, a ordem
  global mascararia qualquer erro de chave
- muda se: passar a existir evento que precise ser ordenado por conta, e não por
  transação. Aí são dois tópicos com chaves diferentes, não uma chave que serve mal aos dois

## Exactly-once do Kafka recusado, entrega ao menos uma vez com consumidor idempotente

**Decisão:** produtor e consumidor comuns, sem transação do Kafka, sem
`processing.guarantee=exactly_once`. A entrega é ao menos uma vez e a repetição é absorvida
pela deduplicação no banco.

**Alternativas consideradas:**

- produtor idempotente com transações do Kafka e `read_committed` no consumidor
- Kafka Streams com `exactly_once_v2`
- deduplicação só por offset comitado, sem `eventId`

**Por quê:**

- o exactly-once do Kafka é exatamente-uma-vez **dentro do Kafka**: cobre o ciclo
  consumir → produzir → comitar offset numa transação do broker. O efeito colateral que
  importa aqui é um `UPDATE` no Postgres, que está fora dessa transação
- fechar de verdade exigiria commit em duas fases entre Postgres e Kafka, ou um consumidor
  que guardasse o offset na mesma transação do dado — muito mais máquina para chegar ao
  mesmo lugar que o `eventId` já entrega
- com a idempotência no banco, receber duas vezes é indistinguível de receber uma; o custo
  é um índice único, não latência nem coordenação distribuída
- confiar só no offset comitado não deduplica: o offset avança depois do efeito, e a queda
  entre os dois é justamente o caso que produz a repetição
- muda se: aparecer efeito colateral não idempotente e fora do banco — envio de e-mail,
  chamada a gateway de pagamento. Aí a saída é uma tabela de efeitos aplicados, ainda no
  Postgres, e não exactly-once no broker

## Valor monetário como string decimal no evento

**Decisão:** o `value` trafega no Kafka como `"1000.00"` — string com duas casas fixas —
enquanto o corpo HTTP continua no formato do enunciado, número.

**Alternativas consideradas:**

- número JSON também no evento
- inteiro em centavos no evento
- dar Prisma ao antifraude, para ele ler o `Decimal` do banco

**Por quê:**

- a regra do antifraude é uma comparação de fronteira: `1000.00` aprova e `1000.01`
  rejeita. Número JSON é binário IEEE-754 dos dois lados, e o limite passa a depender de
  como cada serviço parseou o valor
- o antifraude é stateless por decisão de arquitetura: não tem banco nem `Decimal` do
  Prisma para reconstruir o valor. O que não vier exato no payload, ele não tem como
  recuperar
- duas casas fixas tornam a conversão para centavos um `replace('.', '')`, e `BigInt`
  compara inteiro de qualquer tamanho sem biblioteca nova
- centavos em inteiro seria igualmente exato, mas empurraria a divisão por 100 para toda
  borda de leitura e criaria a classe de bug de esquecer de dividir
- muda se: entrar valor com mais de duas casas decimais, como câmbio. A string continua
  servindo; o que muda é a expressão regular do schema

## Tópicos criados pela aplicação no arranque

**Decisão:** os dois serviços chamam o admin do kafkajs no boot e criam os tópicos do
fluxo com `waitForLeaders`, antes de o consumidor assinar.

**Alternativas consideradas:**

- confiar na criação automática do broker, que já está ligada no compose
- criar os tópicos por um serviço de init no `docker-compose.yml`
- documentar o comando `kafka-topics --create` como passo manual no README

**Por quê:**

- a criação automática acontece como efeito colateral da requisição de metadata: a
  primeira responde `This server does not host this topic-partition` enquanto a partição
  ainda não tem líder. O erro é retriável, o transporte do Nest não o retenta, e o processo
  morre no boot — num clone limpo, o serviço simplesmente não sobe
- o número de partições também deixa de ser acidente: a criação automática usa o padrão do
  broker, que é uma partição, e a chave de partição passaria a não significar nada
- serviço de init no compose resolveria o mesmo, mas põe o contrato do tópico na
  infraestrutura, longe do código que depende dele — e exigiria mexer no `docker-compose.yml`
- passo manual no README quebra o critério de subir sem perguntar nada
- muda se: a criação de tópico passar a ser responsabilidade de plataforma, com política de
  retenção e partições definidas fora da aplicação. Aí a chamada sai, e o serviço só falha
  cedo se o tópico não existir

## Camadas visíveis na árvore: `domain`, `application`, `adapters`

**Decisão:** cada feature dos dois serviços tem três pastas — `domain/` (tipos, erros e
portas, zero framework), `application/` (casos de uso puros, com os testes ao lado) e
`adapters/` (HTTP, Kafka e Prisma).

**Alternativas consideradas:**

- arquivos planos dentro da pasta da feature, distinguidos só pelo sufixo do nome
- fatias verticais por caso de uso: uma pasta `create/` e outra `resolve/`, cada uma com
  regra e adaptador juntos
- pasta `test/` separada, espelhando `src/`

**Por quê:**

- plano era o que estava antes: doze arquivos no mesmo nível misturando dois fluxos,
  portas, presenter e módulo. Descobrir o que é regra pura e o que é adaptador exigia
  abrir arquivo e ler import
- a fronteira entre regra e adaptador é o que o desafio pede explicitamente; deixá-la
  invisível na árvore é esconder justamente o que precisa ser defendido
- fatia vertical agruparia bem por fluxo, mas dissolveria essa mesma fronteira: regra pura
  e adaptador Prisma lado a lado, sem nada dizendo qual é qual
- teste ao lado do código mantém visível quando um arquivo de regra não tem teste;
  numa pasta espelhada, a ausência só aparece se alguém for procurar
- três níveis é o teto: `adapters/` fica plano porque o sufixo do nome (`.controller`,
  `.handler`, `prisma-`) já diz de que borda cada um é
- muda se: uma feature crescer a ponto de `adapters/` passar de meia dúzia de arquivos.
  Aí a subdivisão natural é por borda (`adapters/http`, `adapters/persistence`), não por
  caso de uso

## Fiação de mensageria num pacote compartilhado

**Decisão:** `packages/messaging` concentra o produtor Kafka, o token de injeção, a
criação dos tópicos e as duas dependências que carimbam toda mensagem — `Clock` e
`IdGenerator`. Os dois serviços consomem por `KafkaProducerModule.forService(nome)`.

**Alternativas consideradas:**

- manter a fiação duplicada em cada serviço, preservando independência total
- extrair só o publicador, deixando módulo e criação de tópicos em cada app
- uma biblioteca Nest genérica de terceiros no lugar da fiação própria

**Por quê:**

- a duplicação era literal, não conceitual: `ensure-topics` e o arquivo de token tinham
  zero linha de diferença, o módulo dez e o publicador dezessete — e a única diferença
  real era o sufixo do `clientId`, que virou parâmetro
- correção que só é aplicada num dos lados é o risco concreto aqui: os dois bugs desta
  fase (o ciclo de importação do token e o tópico sem líder no boot) apareceram nos dois
  serviços ao mesmo tempo, e tiveram que ser corrigidos duas vezes
- o `EventPublisher` continua declarado como porta dentro do `outbox`: quem consome é que
  define o contrato, e o pacote só oferece uma implementação que o satisfaz. Trocar Kafka
  por outro transporte não encosta na regra
- o preço é acoplamento de versão entre os serviços: subir a versão do transporte passa a
  ser uma mudança que atinge os dois de uma vez
- muda se: os serviços passarem a ser publicados e versionados separadamente. Aí o pacote
  vira artefato versionado, e cada serviço escolhe quando adotar a versão nova

## `POST /transactions` não é idempotente

**Decisão:** a criação não tem `Idempotency-Key`. Duas requisições idênticas criam duas
transações. A idempotência do sistema cobre **reentrega de evento**, não **repetição de
requisição** — e essa fronteira é deliberada, não descuido.

**Alternativas consideradas:**

- `Idempotency-Key` no cabeçalho, com coluna única na tabela e devolução da transação já
  criada quando a chave repete
- deduplicar por conteúdo: mesmo débito, mesmo crédito, mesmo valor
- deduplicar por conteúdo dentro de uma janela de tempo curta
- chave de idempotência derivada do corpo, calculada no servidor

**Por quê:**

- a repetição do lado do evento é consequência que **nós criamos**: a outbox garante
  entrega ao menos uma vez de propósito, então tratar a duplicata é obrigação de quem
  escolheu o padrão. A repetição de HTTP vem de fora, do cliente, e exige cooperação dele
- sem chave enviada pelo cliente, o servidor não tem como distinguir "é a mesma intenção
  repetida" de "são duas intenções iguais": duas transferências de R$ 500 entre as mesmas
  contas no mesmo minuto são caso de uso legítimo, não defeito
- por isso deduplicar por conteúdo — com ou sem janela de tempo — é pior que não
  deduplicar: transforma operação válida em erro silencioso, e o tamanho da janela é chute
  sem critério. Chave derivada do corpo tem o mesmo problema, só que escondido
- `Idempotency-Key` é a solução certa, e o desenho já está claro: coluna `idempotencyKey`
  com `@unique`, tenta inserir, e na violação devolve a linha que ganhou a corrida. O
  `catch` fica **fora** da `$transaction` — o Postgres aborta a transação no primeiro erro
  e não aceitaria a leitura seguinte — o que é indolor porque a transação abortada não
  gravou nada. É o mesmo raciocínio do compare-and-set: resolve a corrida sem lock
- ficou de fora porque o enunciado não pede, não aparece em nenhum requisito, e o escopo
  obrigatório inteiro vale mais que parte dele com sofisticação extra
- traria duas decisões próprias que também precisariam de resposta: mesma chave com corpo
  diferente deve responder 409, e não devolver silenciosamente a transação antiga; e a
  chave precisa de prazo de validade, senão o índice cresce para sempre
- muda se: a API for exposta a cliente com retentativa automática — aplicativo móvel, SDK
  ou gateway com retry — ou se o valor deixar de ser exercício. Nesse cenário é o primeiro
  item a entrar, antes de DLQ e antes de `FOR UPDATE SKIP LOCKED`

## `eventId` do resultado derivado do evento de origem

**Decisão:** uuid v5 sobre o `eventId` da criação, namespace fixo no código, em vez de uuid
aleatório a cada revisão.

**Alternativas consideradas:**

- uuid aleatório, com deduplicação por `transactionExternalId`
- reusar o `eventId` da criação como id do resultado
- estado no antifraude, guardando o que já foi revisado
- uuid v5 vindo de dependência (`uuid`)

**Por quê:**

- a dedup é `@@unique([transactionId, eventId])`; id aleatório nunca casa numa reentrega
- reentrega é rotina, não exceção: o handler deixa a exceção subir, o rebalance reprocessa
  o lote, `fromBeginning: true` em grupo novo reprocessa o tópico
- dedup por `transactionExternalId` limitaria a transação a uma transição na vida
- reusar o id da criação daria a dois eventos a mesma identidade; no envelope o `eventId`
  identifica a mensagem, não o assunto
- estado no antifraude contraria a decisão de mantê-lo sem banco
- a derivação são 20 linhas de SHA-1 sobre `node:crypto`, com vetor da RFC no teste
- muda se: o resultado passar a depender de algo além do evento de origem — política
  versionada, consulta externa. Aí a origem não determina mais a saída

## Teto de tentativas na outbox, sem fila de mensagens mortas

**Decisão:** `listPending` ignora `attempts >= 5`; a tentativa que atinge o teto vai para
log de erro.

**Alternativas consideradas:**

- fila de mensagens mortas em tabela ou tópico próprio
- `nextAttemptAt` com recuo exponencial
- seguir sem teto

**Por quê:**

- `attempts` era escrita e nunca lida
- mensagem impublicável — payload acima do `message.max.bytes`, tópico sem permissão —
  fica pendente para sempre e, sendo a mais antiga, encabeça todo lote
- `OUTBOX_BATCH_SIZE` delas bastam para o lote inteiro virar veneno e nada mais publicar
- teto é uma linha de `WHERE`; recuo exponencial pede coluna nova e migração, e resolve a
  falha transitória, que a nova tentativa a cada segundo já resolve
- fila de mensagens mortas exige onde republicar e quem opera: fora do escopo
- log de erro é o mínimo para a mensagem não sumir calada
- muda se: existir operação de verdade. Aí a esgotada vai para tabela própria com reenvio
  manual, e o teto vira política dela

## `fromStatus` nulo quando não houve transição

**Decisão:** a linha do histórico grava `PENDING` só quando o compare-and-set mudou a
transação; senão, `null`.

**Alternativas consideradas:**

- `PENDING` fixo, como o evento presume
- ler o status corrente na transação e gravar o valor real
- não gravar linha quando o compare-and-set não encontra nada pendente

**Por quê:**

- `PENDING` fixo escreve no log append-only uma transição que não houve, indistinguível da
  real
- ler antes de escrever é o `SELECT` seguido de `UPDATE` que a idempotência proíbe
- o resultado do próprio compare-and-set já responde, sem leitura extra
- não gravar linha quebraria a dedup, que depende do evento estar registrado
- `null` já era admitido pela coluna e é a leitura honesta: evento chegou, transição não
- muda se: o histórico virar a fonte da verdade do status corrente. Aí toda linha precisa
  de origem conhecida
