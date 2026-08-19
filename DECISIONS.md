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

## Conta como referência opaca, sem modelo próprio no serviço

**Decisão:** `accountExternalIdDebit` e `accountExternalIdCredit` são colunas `uuid` sem
chave estrangeira e sem tabela `accounts` do outro lado. O serviço `transactions` registra a
referência: não valida se a conta existe, não guarda saldo e não é dono do cadastro.

**Alternativas consideradas:**

- modelar `Account` com saldo, debitando e creditando na mesma transação do insert
- tabela `accounts` só como catálogo, com chave estrangeira a partir de `transactions`,
  sem saldo
- devolver as contas na leitura e oferecer filtro por conta, transformando a listagem em
  extrato

**Por quê:**

- o próprio nome do campo no enunciado carrega a decisão: `accountExternalId*`. _External_
  diz que a conta pertence a outro sistema — este serviço é o livro de transações, não o
  dono da conta
- saldo exigiria consistência entre débito e crédito dentro da mesma transação, e com ela
  vem travamento por conta, ordem de aquisição para não deadlocar e conta movimentada
  virando ponto quente; é um domínio inteiro que o enunciado não pede
- saldo também colidiria de frente com a validação assíncrona: o dinheiro sairia da conta
  antes de o antifraude decidir, e cada rejeição precisaria de estorno — o que troca um
  problema de escrita por um de compensação
- chave estrangeira para `accounts` obrigaria a conta a existir antes da transação, e não há
  cadastro nem autenticação neste desafio: a conta de origem não teria de onde vir
- consequência assumida: `transactionViewSchema` devolve o formato do enunciado, que não
  inclui as contas; não há filtro por conta na listagem; e o botão _Gerar_ do formulário
  emite um uuid novo a cada clique, então nenhuma conta se repete entre transações. O
  dashboard mostra transações isoladas, não o caminho do dinheiro
- muda se: entrar autenticação — aí a conta de origem passa a vir da sessão e não do corpo —
  ou passar a existir um serviço de contas; nesse ponto a leitura devolveria as contas e o
  filtro por conta viria junto, sustentado por um índice em cada uma das duas colunas

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

## `eventId` do resultado derivado do evento de origem

**Decisão:** o `eventId` do `transaction.status.updated` é um uuid v5 sobre o `eventId` do
`transaction.created` que o originou, com namespace fixo no código, em vez de um uuid
aleatório por revisão.

**Alternativas consideradas:**

- manter o uuid aleatório e deduplicar por `transactionExternalId` no consumidor
- reusar o `eventId` da criação como `eventId` do resultado
- guardar no antifraude os eventos já revisados, para não revisar duas vezes
- uuid v5 derivado, com a implementação vinda de uma dependência (`uuid`)

**Por quê:**

- a deduplicação é `@@unique([transactionId, eventId])`. Com id aleatório essa chave nunca
  casa numa reentrega: o mesmo fato chega com identidade nova, entra no histórico como se
  fosse novo, e o compare-and-set devolve `ignored` em silêncio
- a reentrega não é hipótese: o handler deixa a exceção subir de propósito, o rebalance do
  consumidor reprocessa o lote, e o `fromBeginning: true` num grupo novo reprocessa o
  tópico inteiro de uma vez
- deduplicar por `transactionExternalId` fecharia a porta para sempre — uma transação só
  poderia ter uma transição na vida, o que quebra qualquer fluxo de reversão futuro
- reusar o `eventId` da criação faria dois eventos diferentes carregarem a mesma
  identidade; o envelope diz que `eventId` identifica a mensagem, não o assunto dela
- estado no antifraude contraria a decisão de mantê-lo sem banco
- a derivação são vinte linhas de SHA-1 sobre `node:crypto`, com vetor da RFC no teste; uma
  dependência nova pesa mais que isso
- muda se: o resultado passar a depender de algo além do evento de origem — política
  versionada, consulta externa. Aí a origem deixa de determinar a saída e o id precisa
  incluir essa outra entrada

---

## Teto de tentativas na outbox, sem fila de mensagens mortas

**Decisão:** `listPending` ignora mensagem com `attempts >= 5`, e a tentativa que atinge o
teto é registrada em log de erro.

**Alternativas consideradas:**

- fila de mensagens mortas de verdade, em tabela ou tópico próprio
- `nextAttemptAt` com recuo exponencial, em vez de teto
- continuar sem teto, contando com o operador para notar a fila parada

**Por quê:**

- a coluna `attempts` já era escrita e nunca lida. Sem leitura, uma mensagem que não tem
  como publicar — payload acima do `message.max.bytes`, tópico sem permissão — fica
  pendente para sempre e, sendo a mais antiga, encabeça todo lote. Bastam
  `OUTBOX_BATCH_SIZE` dessas para o lote inteiro virar veneno e nada mais ser publicado
- o teto é uma linha de `WHERE`; recuo exponencial pede coluna nova e migração, e resolve o
  caso da falha transitória, que a nova tentativa a cada segundo já resolve
- fila de mensagens mortas é o destino certo, mas exige onde republicar e quem opera —
  fora do escopo deste exercício. O log de erro é o mínimo para a mensagem não sumir calada
- muda se: aparecer operação de verdade. Aí a mensagem esgotada vai para tabela própria com
  reenvio manual, e o teto vira política dela

---

## `fromStatus` nulo quando não houve transição

**Decisão:** a linha do histórico grava `fromStatus: 'PENDING'` só quando o compare-and-set
mudou a transação; quando não mudou, grava `null`.

**Alternativas consideradas:**

- manter `PENDING` fixo, como afirmação do que o evento presume
- ler o status corrente dentro da transação e gravar o valor real
- não gravar linha nenhuma quando o compare-and-set não encontra nada pendente

**Por quê:**

- `PENDING` fixo escreve no log append-only uma transição que não aconteceu, e nada na
  linha a distingue da real. Log de auditoria que mente é pior que log ausente
- ler o status antes de escrever é o `SELECT` seguido de `UPDATE` que a idempotência
  proíbe; o resultado do próprio compare-and-set já responde a pergunta sem leitura extra
- não gravar linha nenhuma quebraria a deduplicação, que depende de o evento estar
  registrado para reconhecer a repetição
- `null` já era o que a coluna admitia, e é a leitura honesta: o evento chegou, nenhuma
  transição saiu dele
- muda se: o histórico passar a ser a fonte da verdade do status corrente. Aí toda linha
  precisa de origem conhecida, e a origem vira parte do que o compare-and-set devolve

---

## Paginação por deslocamento, com `total` contado junto

**Decisão:** a listagem pagina com `page` e `pageSize` (`OFFSET`/`LIMIT`), teto de 100 itens
por página, ordenada por `createdAt` decrescente com desempate por `id`, e devolve
`total` e `totalPages` contados com os mesmos filtros, na mesma transação da página.

**Alternativas consideradas:**

- keyset (cursor por `[createdAt, id]`, `WHERE (createdAt, id) < (?, ?)`)
- cursor opaco codificado, escondendo o critério de ordenação do cliente
- devolver só `hasNext`, sem contagem total
- estimar o total pelo `reltuples` do `pg_class` em vez de contar

**Por quê:**

- o dashboard é o cliente, e ele mostra "página 3 de 7" e permite salto direto. Keyset não
  sabe dizer em que página está nem pular para a sétima: ele só anda para frente e para
  trás a partir de onde parou
- o custo do `OFFSET` é proporcional ao deslocamento — o banco varre e descarta as linhas
  puladas — e o `COUNT(*)` é uma segunda varredura do mesmo filtro. Nas dezenas de milhares
  de linhas deste exercício isso é irrelevante; é nas centenas de milhares que vira o
  gargalo, e aí os dois problemas aparecem juntos
- o preço honesto do deslocamento é o desalinhamento: uma inserção durante a navegação
  empurra as linhas para baixo e faz um item aparecer duas vezes ou nenhuma entre páginas
  vizinhas. Com ordenação decrescente as inserções entram no topo, então o efeito existe.
  O desempate por `id` só garante ordem determinística, não imunidade ao deslocamento —
  quem elimina isso é keyset, que ancora no último item visto e não em uma contagem
- os índices que sustentam a listagem — `[status, createdAt]`, `[transferTypeId, createdAt]`
  e `[createdAt, id]` para a listagem sem filtro — são os mesmos que keyset usaria: migrar
  é trocar o `WHERE` e o formato do cursor, sem tocar em schema
- o teto de `page` existe pelo mesmo motivo do teto de `pageSize`: sem ele o cliente decide
  quantas linhas o banco varre para descartar. É também onde a decisão se anuncia — passar
  do teto é o sinal de que o caso pede cursor, não uma página mais distante
- o teto de 100 existe porque sem ele o cliente escolhe o custo da consulta
- muda se: a listagem passar de algo como 10^5 linhas por filtro, ou se a interface trocar
  a paginação numerada por rolagem infinita. Nesse cenário o cursor por `[createdAt, id]`
  entra e o total vira estimativa, ou some

---

## Contrato de leitura da listagem em `packages/contracts`

**Decisão:** schema Zod da resposta do `GET /transactions` (`transactionViewSchema`,
`pageMetadataSchema`, `listTransactionsResponseSchema`) e catálogo `TRANSFER_TYPES` movidos
para `packages/contracts`; presenter da API deriva os tipos dali e o dashboard valida a
resposta com o mesmo schema.

**Alternativas consideradas:**

- interface do presenter ficando em `apps/transactions` e o front redeclarando o tipo
- front sem validação, confiando no `as ListTransactionsResponse`
- gerar tipos a partir de um OpenAPI publicado pela API
- catálogo de tipos exposto por um `GET /transfer-types`

**Por quê:**

- interface some na compilação: o front recebe JSON em runtime e precisa de schema, não de
  tipo. Sem validar, renomear um campo na API quebra a tela do usuário, não o build
- a query já morava nos contratos pelo mesmo argumento; a resposta era a metade que faltava
- o catálogo tem dois leitores — seed e filtro do dashboard. Duplicar faria o tipo novo
  aparecer no banco e não na tela, sem ninguém perceber
- OpenAPI seria a escolha se os serviços fossem repositórios separados; dentro do monorepo
  ele adiciona geração de código para resolver o que o import já resolve
- muda se: a API passar a ser consumida por cliente fora deste monorepo

---

## CORS com origem única vinda do ambiente

**Decisão:** `app.enableCors({ origin: WEB_ORIGIN })` no serviço de transações, com
`WEB_ORIGIN` obrigatório no `.env` e normalizado para origem pura (`new URL(v).origin`).

**Alternativas consideradas:**

- `origin: '*'`
- rewrite do Next (`/api/*` → serviço de transações), deixando tudo na mesma origem
- gateway na frente dos dois serviços

**Por quê:**

- dashboard e API sobem em portas diferentes, e porta diferente já é origem diferente: sem
  CORS o navegador recebe a resposta e recusa entregar ao script
- `*` tornaria a API chamável por qualquer página aberta no navegador de quem estiver
  autenticado — hoje não há credencial, mas a regra não deve nascer permissiva
- rewrite do Next esconderia o serviço atrás do front e deixaria de exercitar o
  `NEXT_PUBLIC_API_URL` que o enunciado pede
- normalizar evita a falha mais chata do CORS: barra final no `.env` bloqueia tudo, e o
  sintoma no navegador é um erro de rede genérico
- muda se: entrar cookie de sessão (precisaria de `credentials` e lista de origens) ou um
  gateway único na frente

---

## Estado dos filtros no componente, e não na URL

**Decisão:** `useState` na view guarda rascunho, filtros aplicados e página. A URL não
carrega o estado da listagem.

**Alternativas consideradas:**

- `useSearchParams` + `router.replace`, com a query da URL como fonte da verdade
- biblioteca de sincronização (nuqs)

**Por quê:**

- URL como estado exigiria mock de `next/navigation` em todo teste de tela e lidar com a
  atualização assíncrona do router — custo de teste alto para a fase
- o preço é real e conhecido: link de listagem filtrada não é compartilhável e o filtro não
  sobrevive ao refresh
- muda se: a tela precisar ser compartilhada por link ou aparecer "voltar" preservando o
  filtro — aí a URL passa a ser a fonte da verdade e o estado local vira derivado

---

## Filtro aplicado por submissão, não a cada tecla

**Decisão:** dois estados de filtro — rascunho (o que está nos campos) e aplicado (o que a
busca usa). A requisição só sai no "Aplicar filtros", e aplicar volta para a página 1.

**Alternativas consideradas:**

- buscar a cada mudança de campo, com debounce
- buscar a cada mudança, sem debounce

**Por quê:**

- período tem dois campos: buscar a cada tecla dispararia requisição para intervalo pela
  metade, que a API recusa com 400 (`from` posterior a `to`)
- debounce esconde o problema atrás de um tempo arbitrário e ainda gera busca descartada
- voltar para a página 1 evita o estado sem saída: filtro novo encurta a lista, e a página
  sete do resultado anterior costuma não existir no novo
- muda se: a listagem passar a ter um único campo de busca textual, onde busca incremental
  é o comportamento esperado

---

## Sistema de interface próprio, com tokens no `@theme`

**Decisão:** primitivos em `src/components/ui` (Button, Select, Input, Field, Card, Badge,
StatusPanel, Spinner) sobre tokens semânticos declarados no `@theme` do Tailwind. Sem
biblioteca de componentes; sem sombra, separação por borda de 1px; `<select>` nativo com
`appearance-none` e seta desenhada.

**Alternativas consideradas:**

- shadcn/ui ou Radix como base de primitivos
- MUI / Chakra
- Tailwind aplicado direto em cada componente, sem primitivos nem tokens
- dropdown próprio em JavaScript, para controle total do visual

**Por quê:**

- o enunciado pede Tailwind; biblioteca de componentes traria dependência e um segundo
  sistema de estilo para uma tela e meia
- Tailwind espalhado sem token faz a cor virar decisão de cada arquivo: trocar a identidade
  vira caça a `zinc-600` em vinte lugares
- dropdown em JS custaria papel `combobox`, navegação por teclado, busca por digitação e o
  seletor nativo do celular — tudo que o elemento entrega de graça, e nada disso se paga
  com CSS depois
- muda se: o produto crescer para dezenas de telas com combos que o HTML não tem
  (multi-seleção, combobox com busca) — aí Radix entra como base e os tokens permanecem

---

## Tabela permanece montada durante o refetch

**Decisão:** o estado `ready` carrega um `refreshing`. Enquanto a nova página não chega, a
tabela continua na tela marcada com `aria-busy`, e a região viva (`role="status"`) existe
desde o primeiro render. O painel de espera cheio fica só para a primeira carga.

**Alternativas consideradas:**

- trocar a tabela pelo painel de "carregando" em toda busca
- overlay bloqueando a tabela
- não indicar nada durante o refetch

**Por quê:**

- desmontar a tabela tira o foco do teclado do botão que acabou de ser clicado ("próxima
  página"), e o foco volta para o `body`: o próximo Tab recomeça do topo do documento
- região viva inserida junto com o texto costuma não ser anunciada pelo leitor de tela;
  ela precisa existir antes de mudar de conteúdo
- os três estados continuam explícitos — o que muda é que "carregando de novo" deixou de
  ser tratado como "carregando do zero"
- muda se: a listagem ganhar polling (fase seguinte), onde nem o `aria-busy` deve piscar a
  cada ciclo

---

## Atualização de status na interface por polling condicional

**Decisão:** a listagem e o detalhe refazem a leitura a cada três segundos, e apenas
enquanto houver transação `PENDING` na tela. Sem nenhuma pendente, o intervalo se desliga
sozinho e não volta. A volta do polling é silenciosa: não marca `aria-busy`, não anuncia
"carregando" e não troca o conteúdo por um painel de erro se falhar — a próxima volta tenta
de novo.

**Alternativas consideradas:**

- SSE (`text/event-stream`) empurrando a mudança de status
- WebSocket
- polling incondicional, em intervalo fixo
- não atualizar: exigir recarregar a página

**Por quê:**

- o estado final chega em segundos e a tela tem no máximo uma página de linhas; o custo do
  polling condicional aqui é uma requisição a cada três segundos, e só enquanto há o que
  esperar
- `PENDING` é o único estado do qual se sai — aprovada e rejeitada são finais —, então
  "existe pendente na tela" é um gatilho exato, e não uma heurística
- WebSocket é canal bidirecional, e não há nada para o browser mandar de volta: pagaria
  handshake, `ping`/`pong` e reconexão manual para um fluxo que é só de descida
- **SSE seria a escolha sob volume maior** — uma conexão de descida, reconexão automática
  pelo navegador com `Last-Event-ID`, e nenhuma requisição desperdiçada
- o problema que SSE traz aqui: **com múltiplas instâncias de `transactions`, a instância
  que consome do Kafka não é a que segura a conexão do browser**. O consumer group entrega a
  partição a uma instância, e o `EventSource` do usuário está pendurado em outra — que nunca
  fica sabendo da mudança. Resolver exige fan-out entre instâncias: `LISTEN`/`NOTIFY` do
  Postgres, ou um canal de pub/sub em Redis. É infraestrutura nova para um ganho que este
  volume não cobra
- muda se: a tela passar a acompanhar muitas transações abertas ao mesmo tempo, ou o
  intervalo precisar cair abaixo de um segundo — aí SSE com fan-out por `LISTEN`/`NOTIFY`
  passa a valer o custo

---

## Formulário de criação valida com o mesmo schema Zod da API

**Decisão:** o formulário converte o texto dos campos para o formato do corpo e roda o
`createTransactionSchema` de `packages/contracts` — o mesmo que o `POST /transactions`
aplica. As mensagens de erro moram no schema, em português, e são exibidas campo a campo.

**Alternativas consideradas:**

- schema próprio do frontend, espelhando as regras da API
- validar só no servidor e exibir o 400
- react-hook-form com resolver de Zod
- mensagens traduzidas no componente, mantendo o texto padrão do Zod no contrato

**Por quê:**

- schema espelhado é duplicação que envelhece em silêncio: o limite muda de um lado e o
  outro só descobre em produção
- validar só no servidor custa uma ida e volta para dizer que faltou preencher um campo
- react-hook-form resolveria mais do que este formulário tem — quatro campos, uma submissão
  — e traria dependência para o que `useState` e uma função pura já fazem
- a mensagem tem dois leitores: o campo no dashboard e o corpo do 400 para quem chama pelo
  `curl`; escrevê-la no contrato serve os dois, e o texto padrão do Zod ("Too small:
  expected number to be >0") não serve nenhum
- muda se: o formulário crescer para dezenas de campos com dependência entre eles — aí uma
  biblioteca de formulário paga o próprio peso, com o mesmo schema como resolver

---

## Envelope comum a todo evento

**Decisão:** `eventId`, `eventType`, `version`, `occurredAt`, `correlationId`, `data`.
`occurredAt` é hora do fato, não da publicação. Nome do tópico = `eventType`.

**Alternativas consideradas:**

- payload cru, sem envelope
- metadados em cabeçalho Kafka, corpo só com o fato
- CloudEvents
- Schema Registry com Avro

**Por quê:**

- deduplicação é `[transactionId, eventId]`; sem identidade de mensagem, reentrega =
  fato novo
- nenhum dos dois eventos tem campo próprio que sirva de identidade
- `correlationId` amarra criação e resultado; sem ele, investigar é cruzar horário de log
- hora do fato, e não da publicação: outbox publica minutos depois, e republicar não pode
  reescrever a linha do tempo
- cabeçalho Kafka ficaria fora do schema Zod — validação com duas fontes, envelope não
  verificável em teste sem broker
- CloudEvents: vocabulário padronizado para consumidor de fora; aqui os dois compilam juntos
- Schema Registry: resposta quando publicador e consumidor sobem em versões diferentes
- muda se: aparecer consumidor fora do monorepo — Schema Registry antes de CloudEvents

---

## Estratégia de teste

**Decisão:** no gate, só teste que não depende de serviço no ar. Backend: classe pura
instanciada na mão com dublê das portas, sem `Test.createTestingModule`. Frontend: view
montada, `fetch` mockado, consulta por `getByRole`.

**Alternativas consideradas:**

- Testcontainers com Postgres e Kafka dentro do gate
- `Test.createTestingModule`, exercitando a injeção junto
- ponta a ponta por HTTP com Supertest
- Playwright contra a aplicação de verdade
- meta de cobertura

**Por quê:**

- o que quebra é fronteira de regra (1000 aprova, 1000.01 rejeita), transição de status e
  reação a evento repetido ou fora de ordem — tudo decisão de classe pura
- container no gate tira a propriedade que o torna útil: rodar igual na máquina de quem
  clona e no CI, em segundos, sem Docker
- `Test.createTestingModule` testaria fiação declarativa; o erro dela aparece no boot, e o
  gate já constrói os três apps
- `getByRole` antes de `data-testid` é escolha de marcação: papel só existe se a marcação
  estiver certa
- cobertura como meta compra teste de getter
- preço: **nada no gate prova que o round trip do Kafka fecha**. Verificado à mão, com
  `curl` e Kafka UI
- muda se: entrar segundo consumidor ou segunda transição — aí Testcontainers, mas **fora**
  do `pnpm quality`, em job próprio

---

## Alta concorrência de leituras e escritas

Resposta à pergunta do enunciado. Nada abaixo está implementado — o volume deste exercício
não cobra nenhum dos seis itens. O que está implementado é o que os torna possíveis sem
reescrita: índices compostos, compare-and-set e chave de partição.

Ordem de aplicação, começando por medir: `pg_stat_statements` para a consulta cara, lag do
consumer group para a fila que não drena, `pg_stat_activity` para separar CPU do banco de
espera por conexão.

---

### Leitura: índice que cobre o filtro, e paginação por keyset

**Decisão:** manter `[status, createdAt]`, `[transferTypeId, createdAt]` e `[createdAt, id]`;
trocar `OFFSET`/`LIMIT` por cursor em `[createdAt, id]`, `WHERE (created_at, id) < (?, ?)`.

**Alternativas consideradas:**

- deslocamento com contagem cacheada
- total estimado por `reltuples` do `pg_class`
- índice parcial só para `status = 'PENDING'`
- view materializada com a página inicial

**Por quê:**

- custo do `OFFSET` cresce com o deslocamento: página 500 custa 500 vezes a página 1
- keyset ancora no último item visto — mesmo custo em qualquer profundidade
- `COUNT(*)` com os mesmos filtros é segunda varredura; cachear ou estimar resolve o
  `COUNT`, não o `OFFSET`
- os índices da listagem já são os que o keyset usa: migrar é trocar `WHERE` e formato do
  cursor, sem migration
- índice parcial em `PENDING` ajuda o polling, não a listagem geral — refinamento depois
- preço é de produto: keyset não diz "página 3 de 7" nem salta para a sétima. UI vira
  anterior/próxima ou rolagem infinita, e o total vira estimativa ou some

---

### Leitura: réplica de leitura

**Decisão:** replicação física em streaming; listagem, detalhe e polling na réplica,
primário só para escrita.

**Alternativas consideradas:**

- escalar o primário verticalmente
- cache em Redis com TTL curto
- CQRS: projeção de leitura em outro armazenamento, alimentada pelos eventos

**Por quê:**

- perfil é leitura-dominante e o polling piora o desequilíbrio: cada tela aberta lê a cada
  três segundos e nenhuma escreve
- separar os dois tráfegos não muda uma linha de domínio
- escalar o primário compra tempo sem mudar a forma: leitura e escrita disputam o mesmo
  buffer pool e o mesmo teto de conexões
- cache com TTL: o dado mais lido é o que muda sozinho. TTL viraria a latência da
  atualização de status, e invalidar exigiria o mesmo fan-out que fez o SSE ser recusado
- CQRS é o degrau seguinte, e só compensa quando a forma da leitura divergir da escrita —
  hoje é a mesma tabela
- preço: lag de replicação quebra read-your-writes — quem cria e é redirecionado pode
  receber 404. Mitigação: leitura imediatamente posterior a uma escrita vai ao primário

---

### Escrita: compare-and-set, não lock pessimista

**Decisão:** manter `UPDATE ... WHERE id = ? AND status = 'PENDING'` com o unique
`[transactionId, eventId]`; não introduzir `SELECT ... FOR UPDATE`.

**Alternativas consideradas:**

- lock pessimista na linha (`SELECT ... FOR UPDATE`)
- `SERIALIZABLE` com retry no erro `40001`
- fila em memória serializando por agregado
- coluna de versão (`WHERE version = ?`)

**Por quê:**

- lock pessimista segura a linha até o fim da transação: o tempo de transação vira o teto de
  throughput, e o lock é adquirido antes de se saber se há trabalho a fazer
- CAS é uma ida ao banco e nenhuma espera; quem perde a corrida recebe `count: 0` e trata
  como no-op — que é a semântica desejada num consumidor que pode receber duas vezes
- `SERIALIZABLE` empurra o problema para o cliente retentar, e sob contenção o retry é
  trabalho jogado fora
- fila em memória reintroduz estado no processo e um segundo lugar onde a ordem precisa ser
  garantida; a partição do Kafka já faz isso, de forma durável
- versão explícita é o mesmo mecanismo com granularidade maior: hoje `status = 'PENDING'` **é**
  a versão, porque só existe uma transição
- muda se: aparecerem estados intermediários — aí a condição vira coluna de versão

---

### Escrita: partição do tópico é o teto de paralelismo

**Decisão:** número de partições é decisão de capacidade: escalar consumo é aumentar
partição **antes** de instância, mantendo `transactionExternalId` como chave.

**Alternativas consideradas:**

- só subir mais instâncias, com o número de partições atual
- publicar sem chave, round-robin
- um tópico por serviço consumidor

**Por quê:**

- o consumer group atribui partição inteira a uma instância: com três partições, a quarta
  instância sobe, entra no grupo e não recebe nada
- chave por transação paraleliza sem perder ordem: mesmo agregado na mesma partição,
  agregados diferentes em paralelo
- round-robin distribuiria melhor e entregaria criação e resultado fora de ordem — a
  idempotência seguraria a consistência por acidente
- aumentar partição depois muda `hash(chave) % partições`: eventos da mesma transação
  publicados antes e depois caem em partições diferentes, e a ordem entre eles some. Decisão
  tomada com folga, não sob incidente
- partição em excesso cobra metadata, arquivos abertos e rebalance lento — e não resolve
  chave enviesada
- com uma instância por partição, o número de partições é também o teto de escritores
  concorrentes no Postgres: teto previsível é o que permite dimensionar o pool

---

### Backpressure: `pause`/`resume` no consumidor

**Decisão:** sob pico, pausar a partição quando o recurso a jusante satura (pool cheio,
latência de escrita subindo) e retomar quando drenar.

**Alternativas consideradas:**

- reduzir `maxBytes` e o tamanho do lote
- não fazer nada: deixar `max.poll.interval.ms` estourar e o rebalance regular
- fila intermediária em memória
- descartar mensagem sob pressão

**Por quê:**

- Kafka não empurra: o consumidor puxa no ritmo que quiser. O gargalo é o Postgres
- sem pausa, o pool de conexão vira a fila de espera: conexão que espera gera timeout,
  timeout gera reprocessamento, reprocessamento aumenta a carga. O laço se realimenta
- pausar devolve a fila ao Kafka, que é durável e torna a pressão observável: o lag cresce e
  aparece no monitoramento, em vez de a latência explodir em silêncio
- lote menor é granularidade, não controle: reduz o soluço e não impede puxar o próximo
- deixar o rebalance regular é o pior caminho: a instância é expulsa, o grupo reequilibra e o
  lote é reprocessado — trabalho repetido justamente sem folga
- fila em memória perde mensagem no restart e esconde o problema dentro do processo
- custo: `pause()`/`resume()` vivem no consumidor da `kafkajs`, e o transporte do Nest não os
  expõe. É o "muda se" já registrado na decisão do transporte

---

### Conexão: PgBouncer em modo transaction

**Decisão:** pool externo na frente do Postgres, modo transaction, com os serviços apontando
para ele.

**Alternativas consideradas:**

- aumentar `max_connections`
- só ajustar o pool do Prisma em cada processo
- pool embutido, com uma instância de cada serviço

**Por quê:**

- conexão no Postgres é processo do SO com memória própria: algumas centenas custam mais em
  troca de contexto do que entregam em vazão
- `max_connections` alto transforma espera em thrashing
- o total cresce por multiplicação, não por demanda: instâncias × pool do Prisma × (API +
  worker da outbox + consumidor)
- modo transaction devolve a conexão a cada transação e multiplexa dezenas de conexões de
  aplicação em poucas de banco — formato desta carga, feita de transações curtas
- preço: sem estado de sessão entre transações. `SET`, advisory lock de sessão e prepared
  statement nomeado deixam de ser confiáveis. Com Prisma é `?pgbouncer=true`, que desliga os
  prepared statements
- muda se: aparecer transação longa ou dependência de estado de sessão — aí o modo é
  `session` e o ganho cai para perto de zero
