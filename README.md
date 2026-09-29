# Biblioteca API

API REST em TypeScript para gestão de uma biblioteca de livros: usuários, livros e
empréstimos, com autenticação JWT, autorização por papel, validação de DTOs com Zod,
persistência em MongoDB (via Mongoose) e documentação OpenAPI/Swagger.

## Sumário

1. [Como rodar o projeto](#como-rodar-o-projeto) — com Docker (recomendado) ou sem Docker
2. [Conexão com o MongoDB](#conexão-com-o-mongodb)
3. [Arquitetura em camadas](#arquitetura-em-camadas)
4. [Autenticação e Autorização](#autenticação-e-autorização) e [Endpoints disponíveis](#endpoints-disponíveis)
5. [Documentação da API (Swagger)](#documentação-da-api-swagger)
6. [Roteiro de teste](#roteiro-de-teste)
7. [Testes automatizados](#testes)

> **Início rápido:** com o Docker Desktop aberto, rode `docker compose up --build`, acesse
> `http://localhost:3000/docs` e siga o [roteiro de teste](docs/ROTEIRO_DE_TESTE.md).

## Como rodar o projeto

> **Importante:** a criação e a devolução de empréstimos (`POST /loans` e
> `PATCH /loans/:id/return`) usam transações do MongoDB (`session.withTransaction`),
> que exigem um **replica set**. Um `mongod` standalone não funciona para essas
> rotas (veja [Conexão com o MongoDB](#conexão-com-o-mongodb)). O `docker-compose.yml`
> já sobe o Mongo como replica set de um nó, e os testes usam `MongoMemoryReplSet`
> (ver [tests/support/mongo-memory.ts](tests/support/mongo-memory.ts)).

### Rodar com Docker (recomendado)

Pré-requisitos: Docker Desktop (ou Docker Engine + Compose v2, comando `docker compose`)
em execução. Não é necessário ter Node.js nem MongoDB instalados. A primeira execução
baixa as imagens `node:20-slim` e `mongo:7` e compila o projeto; as seguintes são rápidas.

Arquivos Docker do repositório:

| Arquivo | Função |
|---------|--------|
| [Dockerfile](Dockerfile) | Build em dois estágios: compila o TypeScript (`npm run build`) e gera uma imagem final enxuta, só com dependências de produção e `dist/` |
| [docker-compose.yml](docker-compose.yml) | Sobe o `mongo` (replica set de um nó, com healthcheck) e a `api`, que só inicia depois de o Mongo estar saudável |
| [.dockerignore](.dockerignore) | Mantém `node_modules`, `.env`, testes etc. fora da imagem |

```bash
# Bash
cp .env.example .env
docker compose up --build
```

```powershell
# PowerShell
Copy-Item .env.example .env
docker compose up --build
```

O `.env` é opcional para o Docker (sem ele o compose usa padrões de desenvolvimento), mas
permite trocar `JWT_SECRET`, `JWT_EXPIRES_IN` e a porta do host (`PORT`). Dentro do
container a API sempre escuta na 3000 e roda com `NODE_ENV=production`; a `MONGODB_URI`
é definida no próprio `docker-compose.yml` (aponta para o serviço `mongo`). Ou seja, esses
três valores do `.env` não afetam a API dentro do Docker. Sem `.env`, o `JWT_SECRET` é o
padrão público `dev-secret-change-me` — aceitável para avaliar localmente, não para produção.

Como verificar que subiu:

```bash
docker compose ps                      # mongo deve estar "healthy" e api "running"
curl -I http://localhost:3000/docs/    # HTTP 200 OK
```

```powershell
docker compose ps
Invoke-WebRequest http://localhost:3000/docs/ -UseBasicParsing | Select-Object StatusCode
```

Ou abra `http://localhost:3000/docs` no navegador. Para acompanhar os logs:
`docker compose logs -f api`.

> **Erros comuns na subida:** `failed to connect to the docker API` significa que o Docker
> Desktop não está aberto; `port is already allocated` significa que a porta 3000 (ou a
> 27017 do Mongo) está ocupada — pare a outra aplicação ou defina `PORT=3001` no `.env`.

Para parar e para zerar os dados:

```bash
docker compose down        # para e remove os containers (dados do Mongo preservados)
docker compose down -v     # também apaga o volume nomeado: banco zerado
```

> A porta `27017` do Mongo é exposta **somente em `127.0.0.1`** (o banco não tem senha, então
> não fica aberto na rede), para acesso com Compass/mongosh ou para rodar a API fora do Docker.
> Nesse caso a URI externa precisa de `directConnection=true`, por exemplo
> `mongodb://localhost:27017/biblioteca?directConnection=true`.

### Rodar sem Docker

Pré-requisitos: Node.js 18+ (a imagem Docker usa Node 20) e um MongoDB **replica set** acessível. Duas opções:

1. **MongoDB Atlas** (já é replica set): defina `MONGODB_URI` com a URI `mongodb+srv://...`.
2. **Somente o Mongo do compose** (requer Docker):

   ```bash
   docker compose up -d mongo
   ```

   e use no `.env` a URI padrão do `.env.example`:
   `mongodb://localhost:27017/biblioteca?replicaSet=rs0&directConnection=true`.
   Aguarde o Mongo ficar `healthy` (`docker compose ps`) antes de iniciar a API.

> Não rode `docker compose up` (que inclui a `api`) junto com `npm run dev`: os dois
> disputam a porta 3000. Para desenvolver localmente, suba apenas o `mongo`.

```bash
npm install
cp .env.example .env   # PowerShell: Copy-Item .env.example .env

# ambiente de desenvolvimento (hot reload)
npm run dev

# checagem de tipos
npm run typecheck

# build de produção
npm run build
npm start

# testes (não dependem de Docker)
npm test
```

Servidor padrão: `http://localhost:3000`
Documentação Swagger: `http://localhost:3000/docs`

Variáveis de ambiente (`.env` ou variáveis de sistema):

| Variável          | Padrão                    | Descrição                          |
|-------------------|----------------------------|-------------------------------------|
| `PORT`            | `3000`                     | Porta HTTP                          |
| `JWT_SECRET`      | `dev-secret-change-me`     | Segredo usado para assinar o JWT    |
| `JWT_EXPIRES_IN`  | `1h`                       | Tempo de expiração do token         |
| `NODE_ENV`        | `development`              | Ambiente de execução                |
| `MONGODB_URI`     | *(obrigatória, sem padrão)* | String de conexão do MongoDB (precisa ser um replica set). Sem ela, a aplicação não inicia. Veja a próxima seção. |

## Conexão com o MongoDB

A API lê a string de conexão da variável `MONGODB_URI` (obrigatória). Exemplos:

| Cenário | `MONGODB_URI` |
|---------|----------------|
| API e Mongo no compose (definida automaticamente) | `mongodb://mongo:27017/biblioteca?replicaSet=rs0` |
| API no host, Mongo do compose | `mongodb://localhost:27017/biblioteca?replicaSet=rs0&directConnection=true` |
| MongoDB Atlas | `mongodb+srv://usuario:senha@cluster.mongodb.net/biblioteca` |

**Por que replica set?** `POST /loans` e `PATCH /loans/:id/return` alteram o empréstimo
e a disponibilidade do livro dentro de uma transação, e o MongoDB só suporta transações
em replica set (ou cluster sharded). O `docker-compose.yml` inicializa um replica set
`rs0` de um único nó automaticamente (via healthcheck).

**Sintoma de usar standalone:** o cadastro, o login e o CRUD de livros/usuários funcionam,
mas `POST /loans` e `PATCH /loans/:id/return` falham com `500` (erro do MongoDB *"Transaction
numbers are only allowed on a replica set member or mongos"* nos logs).

**`directConnection=true`:** o replica set do compose anuncia o host `mongo:27017`, que
só resolve dentro da rede do Docker. Ao conectar do host (API local, Compass), use
`directConnection=true` para não tentar descobrir esse endereço.

## Arquitetura em camadas

O código segue separação em camadas com **injeção de dependência manual via construtor**:

```
Controller  ->  Service  ->  Repository  ->  MongoDB (via Mongoose)
```

- **Schema** (`*.schema.ts`): define o documento Mongoose (`Schema<T>` + `model<T>`)
  que representa a coleção no MongoDB — a "planta" do dado persistido.
- **Repository** (`*.repository.ts`): acesso aos dados, opera diretamente sobre os
  models Mongoose (`BookModel`, `UserModel`, `LoanModel`) e mapeia o documento
  (`_id`, tipos do Mongoose) para o tipo de domínio da aplicação. Não conhece regras
  de negócio.
- **Service** (`*.service.ts`): contém as regras de negócio (ex.: decrementar
  disponibilidade de um livro ao emprestar, validar papel do usuário, hash de senha).
  Recebe o(s) repository(ies)/service(s) via construtor.
- **Controller** (`*.controller.ts`): traduz `Request`/`Response` do Express, delega
  para o service e define os códigos de status HTTP. Recebe o service via construtor.
- **Routes** (`*.routes.ts`): declara os endpoints Express, aplica middlewares
  (`authMiddleware`, `roleMiddleware`, `selfOrRoleMiddleware`, `validate`) e conecta
  ao controller.

A composição (wiring) de toda a árvore de dependências acontece em [src/app.ts](src/app.ts),
que instancia `repository -> service -> controller` manualmente para cada módulo e
registra as rotas — sem nenhum framework de DI. A conexão com o MongoDB é aberta em
[src/config/database.ts](src/config/database.ts) e estabelecida no bootstrap
([src/server.ts](src/server.ts)), antes da aplicação começar a aceitar requisições.

```
src/
  config/            # variáveis de ambiente, configuração JWT e conexão MongoDB
  modules/
    auth/            # registro e login (rotas públicas)
    users/           # CRUD de usuários (listagem ADMIN; alteração/exclusão ADMIN-ou-dono)
    books/           # CRUD de livros
    loans/           # empréstimos e devoluções
    (cada módulo tem <nome>.schema.ts, .repository.ts, .service.ts,
     .controller.ts, .routes.ts e .dto.ts para validação Zod)
  middlewares/        # auth, role, self-or-role, validate (Zod), error, logger
  utils/               # helpers (object-id.dto, mongo-errors, async-handler, app-error)
  docs/                # geração do spec Swagger/OpenAPI
  app.ts               # composição da aplicação (DI manual + rotas)
  server.ts            # bootstrap HTTP (conecta ao MongoDB antes de subir o servidor)
tests/                 # testes de integração (Vitest + Supertest + mongodb-memory-server)
docs/                  # roteiro de teste manual (ROTEIRO_DE_TESTE.md)
Dockerfile, docker-compose.yml, .dockerignore   # execução com Docker
```

## Autenticação e Autorização

- Login (`POST /auth/login`) retorna um JWT assinado com `sub` (id do usuário) e `role`.
- `authMiddleware` valida o header `Authorization: Bearer <token>` e injeta
  `req.user = { id, role }`.
- `roleMiddleware("ADMIN")` (ou múltiplos papéis) bloqueia o acesso de quem não tiver
  o papel exigido, retornando `403`.
- `selfOrRoleMiddleware("ADMIN")` libera o acesso quando o requisitante tem um dos
  papéis informados **ou** é o dono do recurso (`req.user.id === req.params.id`);
  usado nas rotas `PUT`/`PATCH`/`DELETE /users/:id`.
- Todas as rotas de negócio (`/books`, `/loans`, `/users`) exigem token válido; apenas
  `/auth/register` e `/auth/login` são públicas.

## Endpoints disponíveis

### Auth (público)

| Método | Rota             | Descrição                    |
|--------|------------------|-------------------------------|
| POST   | `/auth/register` | Cria um novo usuário          |
| POST   | `/auth/login`    | Autentica e retorna um JWT    |

**Exemplo — registro**

```http
POST /auth/register
Content-Type: application/json

{
  "nome": "Maria Silva",
  "email": "maria@example.com",
  "senha": "senha123",
  "papel": "MEMBER"
}
```

Resposta `201`:

```json
{
  "id": "670f1a2b3c4d5e6f7a8b9c0d",
  "nome": "Maria Silva",
  "email": "maria@example.com",
  "papel": "MEMBER"
}
```

**Exemplo — login**

```http
POST /auth/login
Content-Type: application/json

{
  "email": "maria@example.com",
  "senha": "senha123"
}
```

Resposta `200`:

```json
{
  "token": "eyJhbGciOi...",
  "user": { "id": "670f1a2b3c4d5e6f7a8b9c0d", "nome": "Maria Silva", "email": "maria@example.com", "papel": "MEMBER" }
}
```

### Users (autenticado)

| Método | Rota          | Papel exigido      | Descrição                                    |
|--------|---------------|--------------------|------------------------------------------------|
| GET    | `/users`      | ADMIN              | Lista todos os usuários                        |
| PUT    | `/users/:id`  | ADMIN ou o próprio | Atualiza um usuário (substituição completa)    |
| PATCH  | `/users/:id`  | ADMIN ou o próprio | Atualiza um usuário (parcial)                  |
| DELETE | `/users/:id`  | ADMIN ou o próprio | Remove um usuário                              |

- Somente ADMIN pode alterar o campo `papel` de um usuário; um MEMBER que tentar
  recebe `400`.
- Um usuário não-ADMIN só pode alterar/excluir a própria conta (`req.user.id ===
  req.params.id`); qualquer outra combinação retorna `403`
  ([selfOrRoleMiddleware](src/middlewares/self-or-role.middleware.ts)).
- A exclusão é bloqueada com `409` se o usuário possuir algum empréstimo `ATIVO` ou
  `ATRASADO`.

**Exemplo — atualizar usuário** (`Authorization: Bearer <token>`)

```json
PATCH /users/670f1a2b3c4d5e6f7a8b9c0d
{ "nome": "Maria Silva Santos" }
```

Resposta `200`:

```json
{
  "id": "670f1a2b3c4d5e6f7a8b9c0d",
  "nome": "Maria Silva Santos",
  "email": "maria@example.com",
  "papel": "MEMBER"
}
```

### Books

| Método | Rota          | Papel exigido | Descrição            |
|--------|---------------|----------------|------------------------|
| POST   | `/books`      | ADMIN          | Cria um livro           |
| GET    | `/books`      | autenticado    | Lista todos os livros   |
| GET    | `/books/:id`  | autenticado    | Busca um livro por ID   |
| PUT    | `/books/:id`  | ADMIN          | Atualiza um livro       |
| DELETE | `/books/:id`  | ADMIN          | Remove um livro         |

**Exemplo — criar livro** (`Authorization: Bearer <token-admin>`)

```json
{
  "titulo": "Dom Casmurro",
  "autor": "Machado de Assis",
  "isbn": "978-85-359-0277-5",
  "quantidadeTotal": 3
}
```

Resposta `201`:

```json
{
  "id": "670f1a2b3c4d5e6f7a8b9c0e",
  "titulo": "Dom Casmurro",
  "autor": "Machado de Assis",
  "isbn": "978-85-359-0277-5",
  "quantidadeTotal": 3,
  "quantidadeDisponivel": 3
}
```

### Loans (autenticado)

| Método | Rota                  | Papel exigido | Descrição                                         |
|--------|-----------------------|----------------|-----------------------------------------------------|
| POST   | `/loans`              | autenticado    | Cria um empréstimo do livro informado                |
| GET    | `/loans`              | autenticado    | ADMIN vê todos; MEMBER vê apenas os seus próprios     |
| GET    | `/loans/:id`          | autenticado    | Busca um empréstimo (dono ou ADMIN)                   |
| PATCH  | `/loans/:id/return`   | autenticado    | Registra a devolução do empréstimo                    |

**Exemplo — criar empréstimo** (`Authorization: Bearer <token>`)

```json
{ "livroId": "670f1a2b3c4d5e6f7a8b9c0e", "diasParaDevolucao": 14 }
```

Resposta `201`:

```json
{
  "id": "670f1a2b3c4d5e6f7a8b9c0f",
  "livroId": "670f1a2b3c4d5e6f7a8b9c0e",
  "usuarioId": "670f1a2b3c4d5e6f7a8b9c0d",
  "dataEmprestimo": "2026-08-24T12:00:00.000Z",
  "dataPrevistaDevolucao": "2026-09-07T12:00:00.000Z",
  "dataDevolucao": null,
  "status": "ATIVO"
}
```

## Documentação da API (Swagger)

Com o servidor rodando, acesse `http://localhost:3000/docs` para a UI interativa do
Swagger, gerada a partir das anotações `@openapi` em cada arquivo `*.routes.ts`
(ver [src/docs/swagger.ts](src/docs/swagger.ts)).

**Como autenticar no Swagger:**

1. Em `POST /auth/login`, clique em *Try it out*, informe e-mail e senha e execute.
2. Copie o valor do campo `token` da resposta (somente o token).
3. Clique em **Authorize** (cadeado no topo), cole o token no campo `bearerAuth` e
   confirme. O esquema é `http`/`bearer`, então a UI adiciona o prefixo `Bearer`
   sozinha — **não digite** `Bearer` antes do token.

## Roteiro de teste

O roteiro completo, com comandos prontos para copiar e colar em **Bash** e **PowerShell**
(tokens e IDs já guardados em variáveis), está em
**[docs/ROTEIRO_DE_TESTE.md](docs/ROTEIRO_DE_TESTE.md)**. Ele foi executado contra o
container Docker e cobre, na ordem:

| # | Passo | Resultado esperado |
|---|-------|--------------------|
| 1–2 | Registrar e fazer login do ADMIN | `201` / `200` com `token` |
| 3 | Criar livro com 1 exemplar (ADMIN) | `201` |
| 4–5 | Registrar e fazer login do MEMBER | `201` / `200` com `token` |
| 6 | Criar empréstimo (usa transação) | `201`, `status: "ATIVO"` |
| 7 | Listar empréstimos | `200` |
| 8 | Devolver o livro (usa transação) | `200`, `status: "DEVOLVIDO"` |
| 9–10 | Emprestar o único exemplar e tentar de novo | `201`, depois `409` (sem exemplares) |
| 11 | MEMBER tentando criar livro | `403` |
| 12 | Requisição sem token | `401` |

Alternativa interativa: faça o mesmo pela UI do [Swagger](#documentação-da-api-swagger).

## Testes

Os testes automatizados **não usam o Docker**: rodam com `npm test` (requer `npm install` antes).

```bash
npm test
```

A suíte roda contra um MongoDB real em memória
([mongodb-memory-server](https://github.com/nodkz/mongodb-memory-server), como
replica set — necessário pelas transações de empréstimo; ver
[tests/support/mongo-memory.ts](tests/support/mongo-memory.ts)), baixado
automaticamente no primeiro `npm test` (requer acesso à internet nessa primeira vez).

Cobertura (Vitest + Supertest), com fluxo feliz e de erro em cada área:

| Área | Arquivos em [tests/](tests/) | O que verifica |
|------|------------------------------|----------------|
| Auth | `auth.test.ts` | registro + login; senha incorreta (`401`) |
| Livros | `books.test.ts`, `books.repository.test.ts`, `books-availability-race.test.ts` | criação por ADMIN, `403` para MEMBER, CRUD e disponibilidade atômica sob concorrência |
| Empréstimos | `loans.test.ts`, `loans.repository.test.ts`, `loans.service.transaction.test.ts` | criação/devolução, `409` sem exemplares, rollback da transação |
| Usuários | `users.test.ts`, `users.repository.test.ts`, `users.service.update-delete.test.ts`, `self-or-role.middleware.test.ts` | `PUT`/`PATCH`/`DELETE` (ADMIN-ou-dono), troca de papel, exclusão bloqueada por empréstimo ativo |
| Infraestrutura | `schemas.test.ts`, `database.test.ts` | schemas Mongoose e erro claro para `MONGODB_URI` ausente/conexão falha |
