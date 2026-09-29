# Roteiro de teste (copiar e colar)

Parte do [README](../README.md) da Biblioteca API. Passo a passo para validar a API de ponta a ponta, **na ordem**. Ele percorre o fluxo
principal (registro, login, livro, empréstimo, devolução) e os erros mais importantes
(`409` e `403`, `401`). Cada bloco existe em duas versões: **Bash** e **PowerShell** —
use a do seu terminal.

- Pré-requisito: a API no ar em `http://localhost:3000` e um banco **vazio** (e-mails e ISBN
  são únicos; para repetir o roteiro, rode `docker compose down -v` e suba de novo).
- No **Windows**, os blocos Bash devem ser executados no **Git Bash** ou no WSL (não no
  `cmd.exe` nem no PowerShell); no PowerShell use os blocos `powershell`.
- Os blocos Bash guardam os valores necessários (tokens e IDs) em variáveis do shell, então
  basta copiar e colar na ordem — não há placeholders para substituir. Se preferir executar
  cada comando isoladamente, os valores são: `TOKEN_ADMIN` (`TA`), `TOKEN_MEMBER` (`TM`),
  `ID_DO_LIVRO` (`LIVRO`) e `ID_DO_EMPRESTIMO` (`EMP`).
- O registro público aceita `papel: "ADMIN"` ([src/modules/auth/auth.dto.ts](../src/modules/auth/auth.dto.ts));
  sem `papel`, o padrão é `MEMBER`. Isso é uma decisão para facilitar a demonstração e a
  avaliação (em produção, o cadastro de ADMIN seria restrito).
- O token expira em `JWT_EXPIRES_IN` (padrão `1h`); se receber `401` no meio do roteiro,
  refaça o login.

```bash
# Bash
B=http://localhost:3000
J="Content-Type: application/json"
```

```powershell
# PowerShell
$B = "http://localhost:3000"
```

**1. Registrar o ADMIN** — `POST /auth/register` → `201`

```bash
curl -X POST $B/auth/register -H "$J" \
  -d '{"nome":"Ana Admin","email":"admin@example.com","senha":"senha123","papel":"ADMIN"}'
```

```powershell
Invoke-RestMethod -Method Post "$B/auth/register" -ContentType "application/json" `
  -Body '{"nome":"Ana Admin","email":"admin@example.com","senha":"senha123","papel":"ADMIN"}'
```

**2. Login do ADMIN** — `POST /auth/login` → `200`. A resposta traz o campo `token`, que
os comandos abaixo guardam em `TA` (`<TOKEN_ADMIN>`).

```bash
TA=$(curl -s -X POST $B/auth/login -H "$J" \
  -d '{"email":"admin@example.com","senha":"senha123"}' | sed 's/.*"token":"\([^"]*\)".*/\1/')
echo $TA
```

```powershell
$TA = (Invoke-RestMethod -Method Post "$B/auth/login" -ContentType "application/json" `
  -Body '{"email":"admin@example.com","senha":"senha123"}').token
$TA
```

**3. Criar um livro com 1 exemplar (ADMIN)** — `POST /books` → `201`. O `id` da resposta é o
`<ID_DO_LIVRO>`, guardado em `LIVRO`. Usamos `quantidadeTotal: 1` de propósito, para
provocar o erro de "sem exemplares" mais adiante.

```bash
LIVRO=$(curl -s -X POST $B/books -H "$J" -H "Authorization: Bearer $TA" \
  -d '{"titulo":"Dom Casmurro","autor":"Machado de Assis","isbn":"978-85-359-0277-5","quantidadeTotal":1}' \
  | sed 's/.*"id":"\([^"]*\)".*/\1/')
echo $LIVRO
```

```powershell
$LIVRO = (Invoke-RestMethod -Method Post "$B/books" -ContentType "application/json" `
  -Headers @{ Authorization = "Bearer $TA" } `
  -Body '{"titulo":"Dom Casmurro","autor":"Machado de Assis","isbn":"978-85-359-0277-5","quantidadeTotal":1}').id
$LIVRO
```

**4. Registrar o MEMBER** — `POST /auth/register` → `201`

```bash
curl -X POST $B/auth/register -H "$J" \
  -d '{"nome":"Maria Silva","email":"maria@example.com","senha":"senha123"}'
```

```powershell
Invoke-RestMethod -Method Post "$B/auth/register" -ContentType "application/json" `
  -Body '{"nome":"Maria Silva","email":"maria@example.com","senha":"senha123"}'
```

**5. Login do MEMBER** — `POST /auth/login` → `200`. O `token` fica em `TM` (`<TOKEN_MEMBER>`).

```bash
TM=$(curl -s -X POST $B/auth/login -H "$J" \
  -d '{"email":"maria@example.com","senha":"senha123"}' | sed 's/.*"token":"\([^"]*\)".*/\1/')
```

```powershell
$TM = (Invoke-RestMethod -Method Post "$B/auth/login" -ContentType "application/json" `
  -Body '{"email":"maria@example.com","senha":"senha123"}').token
```

**6. Criar um empréstimo (MEMBER)** — `POST /loans` → `201`, `status: "ATIVO"`. Esta rota usa
transação (exige replica set). O `id` da resposta é o `<ID_DO_EMPRESTIMO>`, guardado em `EMP`.
O livro passa a ter `quantidadeDisponivel: 0`.

```bash
EMP=$(curl -s -X POST $B/loans -H "$J" -H "Authorization: Bearer $TM" \
  -d "{\"livroId\":\"$LIVRO\",\"diasParaDevolucao\":14}" | sed 's/.*"id":"\([^"]*\)".*/\1/')
echo $EMP
```

```powershell
$EMP = (Invoke-RestMethod -Method Post "$B/loans" -ContentType "application/json" `
  -Headers @{ Authorization = "Bearer $TM" } -Body "{`"livroId`":`"$LIVRO`",`"diasParaDevolucao`":14}").id
$EMP
```

**7. Listar empréstimos** — `GET /loans` → `200` (o MEMBER vê só os seus; o ADMIN vê todos)

```bash
curl $B/loans -H "Authorization: Bearer $TM"
```

```powershell
Invoke-RestMethod "$B/loans" -Headers @{ Authorization = "Bearer $TM" }
```

**8. Devolver o livro** — `PATCH /loans/:id/return` → `200`, `status: "DEVOLVIDO"` (também usa
transação; o exemplar volta a ficar disponível)

```bash
curl -X PATCH $B/loans/$EMP/return -H "Authorization: Bearer $TM"
```

```powershell
Invoke-RestMethod -Method Patch "$B/loans/$EMP/return" -Headers @{ Authorization = "Bearer $TM" }
```

**9. Emprestar de novo (MEMBER)** — `POST /loans` → `201`. O único exemplar volta a ficar
emprestado, preparando o erro do próximo passo.

```bash
curl -X POST $B/loans -H "$J" -H "Authorization: Bearer $TM" -d "{\"livroId\":\"$LIVRO\"}"
```

```powershell
Invoke-RestMethod -Method Post "$B/loans" -ContentType "application/json" `
  -Headers @{ Authorization = "Bearer $TM" } -Body "{`"livroId`":`"$LIVRO`"}"
```

> `diasParaDevolucao` é opcional; sem ele o padrão é 14 dias.

**10. Erro: empréstimo sem exemplares → `409`.** Agora o ADMIN tenta emprestar o mesmo
livro, que não tem mais exemplares disponíveis.

```bash
curl -i -X POST $B/loans -H "$J" -H "Authorization: Bearer $TA" -d "{\"livroId\":\"$LIVRO\"}"
# HTTP 409 — {"error":"ConflictError","message":"Nao ha exemplares disponiveis para este livro"}
```

```powershell
Invoke-RestMethod -Method Post "$B/loans" -ContentType "application/json" `
  -Headers @{ Authorization = "Bearer $TA" } -Body "{`"livroId`":`"$LIVRO`"}"
# Lança uma exceção "(409) Conflito" — o comando falhou como esperado
```

**11. Erro: MEMBER criando livro → `403`**

```bash
curl -i -X POST $B/books -H "$J" -H "Authorization: Bearer $TM" \
  -d '{"titulo":"X","autor":"Y","isbn":"1","quantidadeTotal":1}'
# HTTP 403 — {"error":"ForbiddenError","message":"Papel de usuario nao autorizado para esta acao"}
```

```powershell
Invoke-RestMethod -Method Post "$B/books" -ContentType "application/json" `
  -Headers @{ Authorization = "Bearer $TM" } `
  -Body '{"titulo":"X","autor":"Y","isbn":"1","quantidadeTotal":1}'
# Lança uma exceção "(403) Proibido"
```

**12. Erro: requisição sem token → `401`**

```bash
curl -i $B/loans
# HTTP 401
```

```powershell
Invoke-RestMethod "$B/loans"
# Lança uma exceção "(401) Não Autorizado"
```

> As mensagens de erro da API não têm acentos (`Nao ha exemplares...`) por decisão do
> projeto; o `status` HTTP é o que importa para a validação. Em PowerShell 5.1 o corpo do
> erro não é exibido; para vê-lo, use o Swagger ou o `curl`.
