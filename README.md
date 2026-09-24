# Biblioteca API

API REST em TypeScript para gestão de uma biblioteca de livros: usuários, livros e
empréstimos, com autenticação JWT, autorização por papel, validação de DTOs com Zod,
persistência em memória e documentação OpenAPI/Swagger.

## Como rodar o projeto

Pré-requisitos: Node.js 18+.

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
| `MONGODB_URI`     | *(obrigatória, sem padrão)* | String de conexão do MongoDB (Atlas ou local). Sem ela, a aplicação não inicia. |

## Arquitetura em camadas

O código segue separação em camadas com **injeção de dependência manual via construtor**:

```
Controller  ->  Service  ->  Repository  ->  In-Memory Store
```

- **Repository** (`*.repository.ts`): acesso aos dados, opera diretamente sobre o
  `in-memory-store.ts` (Maps compartilhados). Não conhece regras de negócio.
- **Service** (`*.service.ts`): contém as regras de negócio (ex.: decrementar
  disponibilidade de um livro ao emprestar, validar papel do usuário, hash de senha).
  Recebe o(s) repository(ies) via construtor.
- **Controller** (`*.controller.ts`): traduz `Request`/`Response` do Express, delega
  para o service e define os códigos de status HTTP. Recebe o service via construtor.
- **Routes** (`*.routes.ts`): declara os endpoints Express, aplica middlewares
  (`authMiddleware`, `roleMiddleware`, `validate`) e conecta ao controller.

A composição (wiring) de toda a árvore de dependências acontece em [src/app.ts](src/app.ts),
que instancia `repository -> service -> controller` manualmente para cada módulo e
registra as rotas — sem nenhum framework de DI.

```
src/
  config/            # variáveis de ambiente e configuração JWT
  modules/
    auth/            # registro e login (rotas públicas)
    users/           # listagem de usuários (ADMIN)
    books/           # CRUD de livros
    loans/           # empréstimos e devoluções
  middlewares/        # auth, role, validate (Zod), error, logger
  repositories/        # in-memory-store.ts (Maps compartilhados)
  docs/                # geração do spec Swagger/OpenAPI
  app.ts               # composição da aplicação (DI manual + rotas)
  server.ts            # bootstrap HTTP
tests/                 # testes de integração (Vitest + Supertest)
```

## Autenticação e Autorização

- Login (`POST /auth/login`) retorna um JWT assinado com `sub` (id do usuário) e `role`.
- `authMiddleware` valida o header `Authorization: Bearer <token>` e injeta
  `req.user = { id, role }`.
- `roleMiddleware("ADMIN")` (ou múltiplos papéis) bloqueia o acesso de quem não tiver
  o papel exigido, retornando `403`.
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
  "id": "b1f2c3d4-...",
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
  "user": { "id": "b1f2c3d4-...", "nome": "Maria Silva", "email": "maria@example.com", "papel": "MEMBER" }
}
```

### Users (autenticado)

| Método | Rota     | Papel exigido | Descrição              |
|--------|----------|----------------|--------------------------|
| GET    | `/users` | ADMIN          | Lista todos os usuários  |

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
  "id": "9c2e...",
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
{ "livroId": "9c2e...", "diasParaDevolucao": 14 }
```

Resposta `201`:

```json
{
  "id": "aa11...",
  "livroId": "9c2e...",
  "usuarioId": "b1f2c3d4-...",
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

Cobertura mínima (Vitest + Supertest), cada uma com fluxo feliz e fluxo de erro:

- [tests/auth.test.ts](tests/auth.test.ts): registro + login com sucesso; login com senha incorreta (`401`).
- [tests/books.test.ts](tests/books.test.ts): criação de livro por ADMIN; criação de livro por MEMBER (`403`).
- [tests/loans.test.ts](tests/loans.test.ts): criação de empréstimo com decremento de disponibilidade; empréstimo sem exemplares disponíveis (`409`).

