# Decisões Técnicas

## Bibliotecas e pacotes utilizados

| Pacote                 | Por que foi escolhido |
|-------------------------|------------------------|
| **express**              | Framework HTTP minimalista e padrão de mercado para APIs REST em Node.js; facilita middlewares e roteamento modular. |
| **zod**                  | Validação de esquemas com inferência de tipos TypeScript nativa — o mesmo schema gera o tipo do DTO (`z.infer`), evitando duplicação entre validação em runtime e tipagem estática. |
| **jsonwebtoken**         | Implementação padrão para emissão/verificação de JWT em Node.js, usada para autenticação stateless. |
| **bcrypt**                | Hash de senha com salt, algoritmo estabelecido e resistente a ataques de força bruta/rainbow table; nunca armazenamos senha em texto puro. |
| **swagger-jsdoc** + **swagger-ui-express** | Geração de documentação OpenAPI a partir de comentários `@openapi` nos próprios arquivos de rota, mantendo a documentação perto do código que ela descreve, e servindo uma UI interativa em `/docs`. |
| **vitest** + **supertest** | Vitest por ser rápido e ter API compatível com Jest; Supertest para testes de integração HTTP ponta a ponta, exercitando a stack real de middlewares sem subir um servidor de verdade. |
| **tsx**                   | Execução de TypeScript em desenvolvimento com watch mode, sem precisar compilar manualmente a cada mudança. |

## Decisões arquiteturais

**Separação em camadas (Controller → Service → Repository).**
Cada módulo de domínio (`auth`, `users`, `books`, `loans`) é dividido em:
- `*.repository.ts`: única camada que toca o armazenamento em memória (`in-memory-store.ts`).
  Não tem conhecimento de regras de negócio.
- `*.service.ts`: concentra as regras de negócio (ex.: só permitir empréstimo se houver
  exemplar disponível; decrementar/incrementar `quantidadeDisponivel`; impedir duplicidade
  de e-mail/ISBN). Depende apenas do(s) repository(ies).
- `*.controller.ts`: adapta `Request`/`Response` do Express, delega ao service e escolhe o
  status HTTP de resposta. Não contém regra de negócio.
- `*.routes.ts`: declara os endpoints, aplica middlewares (`authMiddleware`,
  `roleMiddleware`, `validate`) e conecta ao controller.

Essa separação existe para que cada camada tenha uma única responsabilidade e possa ser
testada/substituída isoladamente — por exemplo, trocar o repository em memória por um
repository com banco de dados real não exigiria alterar nenhuma linha do service ou do
controller, pois ambos dependem apenas da interface pública do repository.

**Injeção de dependência manual via construtor.**
Não foi usado nenhum framework de DI (como InversifyJS ou NestJS). Em vez disso, cada
classe recebe suas dependências explicitamente no construtor
(`new BooksService(booksRepository)`, `new BooksController(booksService)`), e toda a
composição da árvore de objetos acontece em um único lugar: [src/app.ts](src/app.ts).
Essa abordagem foi escolhida por ser simples, explícita e fácil de rastrear em um projeto
de porte acadêmico — dá para ler `app.ts` e entender exatamente quem depende de quem, sem
"mágica" de containers de DI ou decorators.

**Persistência em memória com `Map` compartilhado.**
`in-memory-store.ts` expõe um único objeto `store` com três `Map<string, T>` (um por
entidade), instanciado uma única vez por processo. Os repositories leem/escrevem
diretamente nesses Maps. Isso satisfaz o requisito de não usar banco de dados externo,
mantendo uma interface de repository idêntica à que teria uma implementação com banco real
(métodos `create`, `findById`, `findAll`, `update`, `delete`).

**Validação de DTOs centralizada em middleware.**
Em vez de validar manualmente dentro de cada controller (o que levaria a tratamento de erro
inconsistente entre rotas), o middleware `validate.middleware.ts` recebe um schema Zod e
valida `body`/`params`/`query` antes de a requisição alcançar o controller, lançando um erro
padronizado (`AppError`) em caso de falha.

**Tratamento de erros centralizado.**
Toda a aplicação lança subclasses de `AppError` (`NotFoundError`, `UnauthorizedError`,
`ForbiddenError`, `ConflictError`) a partir de qualquer camada (service, middleware). Um
único middleware de erro (`error.middleware.ts`), registrado por último em `app.ts`,
converte essas exceções em respostas HTTP consistentes (`{ error, message }` + status code
correto), evitando `try/catch` duplicado em cada rota.

## Resumo dos fluxos principais

**Autenticação/autorização:** o usuário se registra (`POST /auth/register`, senha
armazenada como hash bcrypt) e faz login (`POST /auth/login`), recebendo um JWT contendo seu
`id` e `papel`. Esse token deve ser enviado em `Authorization: Bearer <token>` em toda
requisição às rotas de negócio; o `authMiddleware` valida o token e popula `req.user`,
enquanto o `roleMiddleware` bloqueia com `403` quem não tiver o papel exigido (por exemplo,
apenas `ADMIN` pode criar/editar/excluir livros).

**Empréstimo de livros:** ao chamar `POST /loans` com o `livroId`, o `LoansService` verifica
se o livro tem `quantidadeDisponivel > 0`; se sim, decrementa essa quantidade e cria o
empréstimo com status `ATIVO` e uma data prevista de devolução. Ao chamar
`PATCH /loans/:id/return`, o serviço marca o empréstimo como `DEVOLVIDO`, registra a data de
devolução e incrementa novamente a disponibilidade do livro. Empréstimos ativos cuja data
prevista já passou são automaticamente reclassificados como `ATRASADO` ao serem consultados.
