# Declaração de Uso de Ferramentas de IA

Em conformidade com a política de uso de IA da disciplina, todas as fontes e ferramentas de
inteligência artificial utilizadas no desenvolvimento deste trabalho estão listadas e
documentadas no arquivo USO_DE_IA.md, disponível no próprio repositório do projeto.

**Trabalho:** Projeto acadêmico — API REST de gestão de biblioteca (pós-graduação)
**Autor:** Felipe Castelhano

## Resumo

O desenvolvimento deste projeto foi realizado com o uso de IA, de forma **planejada e
supervisionada integralmente por mim**. Eu defini o escopo e os requisitos, decidi as
abordagens, aprovei cada etapa antes de ela ser incorporada ao repositório e validei o
resultado executando a aplicação e os testes.

## Ferramentas de IA utilizadas

| Ferramenta | Fornecedor | Como foi usada |
|------------|-----------|----------------|
| **Claude Code** (extensão para VS Code), modelos Claude Sonnet 5 / 5.5 | Anthropic | Assistente de desenvolvimento: geração e alteração de código, testes, documentação, revisão de código e execução de comandos no repositório, sempre a partir de instruções e aprovações minhas. |
| **BMAD** (skills e agentes em `.claude/skills` e `_bmad`) | Método de código aberto, executado pelo Claude Code | Fluxo de trabalho estruturado: esclarecimento da intenção, elaboração de especificação, implementação e revisão adversarial (em camadas) das alterações. Os artefatos dessa etapa ficam em `_bmad-output`. |

Nenhuma outra ferramenta de IA (por exemplo ChatGPT, Copilot ou Gemini) foi utilizada
no desenvolvimento deste trabalho.

## Artefatos do repositório produzidos com auxílio de IA

| Artefato | Uso da IA |
|----------|-----------|
| Código-fonte em `src/` e testes em `tests/` | Implementação e ajustes feitos com o Claude Code, sob minha especificação e revisão. |
| `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `.env.example` | Elaborados com o Claude Code e verificados por execução real (`docker compose up`). |
| `README.md` e `docs/ROTEIRO_DE_TESTE.md` | Redigidos com o Claude Code; os comandos do roteiro foram executados contra a aplicação para confirmar os resultados descritos. |
| `DECISOES.md` e `RELATORIO_VERIFICACAO.md` | Estruturação e revisão de texto com apoio da IA. |
| `USO_DE_IA.md` (este arquivo) | Redigido com apoio da IA e revisado por mim. |

## Como o trabalho foi supervisionado

- **Planejamento:** eu defini o que deveria ser construído e aprovei a especificação antes
  da implementação.
- **Revisão:** todo código e todo texto gerado foi lido e validado por mim antes de ser
  incorporado; nada foi aceito sem revisão.
- **Verificação:** a aplicação foi executada em Docker, o roteiro de teste foi rodado na
  prática, e `npm run typecheck` e `npm test` foram executados para conferir o resultado.
- **Commits e entrega:** os commits e o pull request foram feitos por mim, na minha conta
  do GitHub, com o Claude Code auxiliando na execução dos comandos, sempre sob minha
  autorização.
- **Responsabilidade:** estou ciente de que respostas de IA podem ser imprecisas, e a
  responsabilidade por garantir a correção e a originalidade do trabalho entregue é minha.

**Autor:** Felipe Castelhano
**Data:** 29/09/2026
