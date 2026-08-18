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
