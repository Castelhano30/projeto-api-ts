# Declaração de Uso de Ferramentas de IA

**Disciplina/Trabalho:** Projeto acadêmico — API REST de gestão de biblioteca (pós-graduação)
**Nível declarado:** 🟡 Sinal Amarelo
**Ferramenta utilizada:** Claude (Claude Code / Anthropic), via terminal, como assistente durante o desenvolvimento.

## Como a política do Sinal Amarelo foi interpretada neste trabalho

De acordo com o enunciado, sob Sinal Amarelo o uso de IA é permitido para:

- esclarecimento de dúvidas conceituais;
- consulta de sintaxe;
- auxílio na depuração (debugging);
- refatoração;
- documentação;
- melhoria da qualidade do código.

E **não** é permitido delegar à IA a implementação da API, da arquitetura da aplicação,
das operações de CRUD, da proteção das rotas e das validações — essas partes precisam
ser desenvolvidas e compreendidas pelo próprio aluno. É essa a linha que segui ao decidir
o que pedir para a ferramenta e o que escrever/decidir por conta própria.

## Onde a IA foi usada

| Área | Tipo de uso | Descrição |
|------|-------------|-----------|
| Sintaxe TypeScript/Express | Consulta de sintaxe | Tirei dúvidas pontuais sobre tipagem de middlewares do Express (`Request`/`Response`/`NextFunction`), inferência de tipos com `z.infer` do Zod, e assinatura de `jsonwebtoken`/`bcrypt` que eu não conhecia de antes. |
| Depuração | Debugging | Pedi ajuda para entender erros de tipo do `tsc` e falhas de teste (Vitest/Supertest) que eu não conseguia interpretar sozinho — a IA explicava a causa, mas a correção no código de negócio (regras de estoque, filtros por papel, etc.) fiz eu mesmo depois de entender o problema. |
| Refatoração | Refatoração | Depois de ter uma versão funcional de módulos como `books` e `loans`, usei a IA para sugerir como deixar o código mais consistente entre os módulos (nomes, padrão de erros, organização de arquivos), sempre revisando e ajustando manualmente o resultado. |
| Documentação | Documentação | O `README.md`, o `DECISOES.md` e este próprio arquivo foram organizados com apoio da IA para estruturação e revisão de texto — o conteúdo técnico (o que cada camada faz, por que cada biblioteca foi escolhida) reflete decisões que tomei durante o desenvolvimento. |
| Qualidade de código | Melhoria de qualidade | Sugestões de nomes mais claros, remoção de duplicação e checagem de aderência ao `tsconfig` em modo `strict`. |
| Verificação final | Auxílio de revisão | Pedi à IA para rodar a suíte de testes e o `typecheck` e conferir, item a item, se o projeto atendia a rubrica da disciplina — o resultado está registrado em [RELATORIO_VERIFICACAO.md](RELATORIO_VERIFICACAO.md). Essa é uma checagem, não uma implementação: nenhuma lógica de negócio foi escrita pela IA nessa etapa.

## O que foi feito por mim, sem delegar à IA

Conforme exigido pela política, a parte central do trabalho foi feita e compreendida por mim:

- **Arquitetura da aplicação**: a decisão de separar em camadas `Controller -> Service ->
  Repository -> Store`, e de usar injeção de dependência manual via construtor (sem
  framework de DI), foi minha, com base no que estudei na disciplina.
- **Implementação da API e das rotas**: os endpoints de `auth`, `users`, `books` e `loans`
  (`src/modules/`) foram escritos e testados manualmente por mim, entendendo o que cada
  rota deveria fazer antes de escrevê-la.
- **Regras de negócio (CRUD)**: as regras específicas do domínio — como verificar
  disponibilidade de exemplares antes de criar um empréstimo, decrementar/incrementar
  `quantidadeDisponivel`, impedir devolução duplicada, impedir e-mail/ISBN duplicado — são
  decisões e implementações minhas, documentadas em [DECISOES.md](DECISOES.md).
- **Proteção das rotas (autenticação/autorização)**: a lógica de `authMiddleware` (validação
  de JWT) e `roleMiddleware` (checagem de papel ADMIN/MEMBER), bem como a decisão de quais
  rotas exigem quais papéis, foi definida e implementada por mim.
- **Validações (DTOs)**: os schemas Zod de cada módulo (`*.dto.ts`) e a decisão de validar
  `body`/`params`/`query` via middleware antes do controller foram escritos por mim,
  entendendo o que cada campo precisava validar.

## Observações finais

- Todo trecho de código sugerido pela IA foi lido, entendido e adaptado por mim antes de
  ser incorporado ao projeto — nada foi colado sem revisão.
- Estou ciente de que respostas de IA podem ser imprecisas ou tendenciosas, e de que a
  responsabilidade por garantir a correção do que foi usado é minha.
- Esta declaração é meu registro de uso de IA, feito de boa-fé, para atender ao requisito
  de citação de fontes do enunciado.
- Este próprio arquivo (`USO_DE_IA.md`) foi redigido com auxílio da IA (Claude, da
  Anthropic), a partir do levantamento do que foi feito no projeto, e revisado e
  supervisionado por mim, Felipe Castelhano.

**Autor:** Felipe Castelhano
**Data:** 24/08/2026
