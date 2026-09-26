# Biblioteca API

API REST em TypeScript para gestão de uma biblioteca de livros: usuários, livros e
empréstimos, com autenticação JWT, autorização por papel, validação de DTOs com Zod,
persistência em MongoDB (via Mongoose) e documentação OpenAPI/Swagger.

## Como rodar o projeto

Pré-requisitos: Node.js 18+ e uma instância MongoDB acessível (Atlas ou local).

> **Importante:** a criação e a devolução de empréstimos (`POST /loans` e
> `PATCH /loans/:id/return`) usam transações do MongoDB (`session.withTransaction`),
> que exigem um **replica set** — um Atlas gratuito já atende, mas um `mongod`
> standalone local (ex.: `docker run mongo` sem `--replSet`) não funciona para essas
> rotas. Os testes usam `MongoMemoryReplSet` por esse motivo (ver
> [tests/support/mongo-memory.ts](tests/support/mongo-memory.ts)).

```bash
npm install

# ambiente de desenvolvimento (hot reload)
npm run dev

# checagem de tipos
npm run typecheck

# build de produção
npm run build
npm start

# testes
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
| `MONGODB_URI`     | *(obrigatória, sem padrão)* | String de conexão do MongoDB (Atlas ou local, precisa ser um replica set — veja aviso acima). Sem ela, a aplicação não inicia. Ex.: `mongodb+srv://user:senha@cluster.mongodb.net/biblioteca` |

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

## Testes

```bash
npm test
```

A suíte roda contra um MongoDB real em memória
([mongodb-memory-server](https://github.com/nodkz/mongodb-memory-server), como
replica set — necessário pelas transações de empréstimo; ver
[tests/support/mongo-memory.ts](tests/support/mongo-memory.ts)), baixado
automaticamente no primeiro `npm test` (requer acesso à internet nessa primeira vez).

Cobertura (Vitest + Supertest), cada uma com fluxo feliz e fluxo de erro:

- [tests/auth.test.ts](tests/auth.test.ts): registro + login com sucesso; login com senha incorreta (`401`).
- [tests/books.test.ts](tests/books.test.ts): criação de livro por ADMIN; criação de livro por MEMBER (`403`).
- [tests/books.repository.test.ts](tests/books.repository.test.ts) e
  [tests/books-availability-race.test.ts](tests/books-availability-race.test.ts): CRUD do
  repositório e decremento/incremento atômico de disponibilidade sob concorrência.
- [tests/loans.test.ts](tests/loans.test.ts): criação de empréstimo com decremento de disponibilidade; empréstimo sem exemplares disponíveis (`409`).
- [tests/loans.repository.test.ts](tests/loans.repository.test.ts) e
  [tests/loans.service.transaction.test.ts](tests/loans.service.transaction.test.ts): CRUD do
  repositório e rollback da transação de criação/devolução em caso de falha.
- [tests/users.test.ts](tests/users.test.ts): listagem (ADMIN), `PUT`/`PATCH`/`DELETE
  /users/:id` (ADMIN-ou-dono, bloqueio de troca de papel por não-ADMIN, exclusão
  bloqueada por empréstimo ativo).
- [tests/users.repository.test.ts](tests/users.repository.test.ts) e
  [tests/users.service.update-delete.test.ts](tests/users.service.update-delete.test.ts):
  CRUD do repositório e regras de negócio de atualização/exclusão.
- [tests/self-or-role.middleware.test.ts](tests/self-or-role.middleware.test.ts): autorização ADMIN-ou-dono.
- [tests/schemas.test.ts](tests/schemas.test.ts): validação dos schemas Mongoose (obrigatoriedade, unicidade, enums).
- [tests/database.test.ts](tests/database.test.ts): erro claro quando `MONGODB_URI` está ausente ou a conexão falha.

