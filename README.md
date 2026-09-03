# Laboratório de Alquimia & Feitiçaria

Gerenciador de tarefas acadêmicas em formato de quadro Kanban, tematizado como
um laboratório de alquimia. Projeto da disciplina de Front-End.

## Entrega atual: E3 — dados pela rede e os quatro estados

Na E2 o quadro era HTML escrito à mão. Na E3 a origem dos dados mudou: as
tarefas vêm de `dados.json`, buscado com `fetch` na mesma origem da página, e a
tela passa a ter **quatro estados** em vez de um.

| Estado | Quando acontece | O que aparece |
| --- | --- | --- |
| Carregando | aplicado antes do `await`, enquanto a resposta não chega | painel com o caldeirão aquecendo |
| Sucesso | a lista chegou com pelo menos uma tarefa | as quatro colunas com os cartões, mais a contagem |
| Vazio | a lista chegou, mas `tarefas.length === 0` | painel dizendo que o grimório está em branco |
| Erro | rede, protocolo ou formato falharam | painel vermelho com a causa e o botão de refazer |

## Como rodar

A página precisa ser servida por HTTP: com `file:` o `fetch` de um arquivo
local é bloqueado pela política de mesma origem.

```sh
python -m http.server 8000
# depois abra http://localhost:8000
```

No VS Code, a extensão Live Server também serve.

## Arquitetura

```
index.html          região viva vazia, painel de estado e o quadro vazio
dados.json          origem dos dados: objeto raiz com a chave "tarefas"
js/api.js           carregarTarefas(): busca, confere e devolve o array
js/estados.js       renderizarEstado(estado, dados): escolhe qual tela vale
js/renderizacao.js  renderizarTarefas(tarefas): desenha os cartões
js/app.js           orquestra: pede os dados e manda desenhar o estado
js/dados.js         array da aula 5, aposentado; ninguém mais importa
```

A regra que sustenta o resto: **obter dados e desenhar dados são funções
diferentes.** `api.js` não encosta no DOM e `estados.js` não faz requisição.
`renderizarTarefas` recebe um array por parâmetro e não sabe de onde ele veio,
e por isso não precisou mudar quando a origem dos dados mudou.

## Como verificar os quatro estados

Cada teste roda pela URL, sem editar código. O parâmetro `?fonte=` troca apenas
o caminho relativo passado a `carregarTarefas()`.

| Teste | Como reproduzir | Resultado esperado |
| --- | --- | --- |
| Carregando | DevTools > Network > throttling **Slow 4G**, recarregar | o painel do caldeirão fica legível durante a espera |
| Sucesso | `http://localhost:8000/` | 10 cartões e a contagem "10 fórmulas catalogadas" |
| Vazio | `?fonte=dados-vazio.json` | painel do grimório em branco, e não uma tela de erro |
| Erro de protocolo | `?fonte=nao-existe.json` | "O servidor recusou o pedido (HTTP 404)" |
| Erro de rede | DevTools > Network > throttling **Offline**, recarregar | "Não foi possível alcançar o laboratório" |
| Erro de formato | `?fonte=dados-quebrado.json` | "O grimório chegou ilegível" |
| Região viva | DevTools > Elements, antes de qualquer interação | `#regiao-status` existe e está vazio |

Os arquivos `dados-vazio.json` e `dados-quebrado.json` existem só para esses
testes. O `dados-quebrado.json` tem uma vírgula sobrando de propósito.

## Acessibilidade

- `#regiao-status` tem `role="status"` e `aria-live="polite"`, está no HTML
  desde o início e nasce vazio; só o JavaScript escreve nele.
- Todo texto de estado entra por `textContent`, nunca por `innerHTML`.
- `aria-live="assertive"` não é usado: a troca de estado informa, não interrompe.
- A animação do ícone de carregando respeita `prefers-reduced-motion`.

## Fora do escopo desta entrega

Busca e filtros continuam desligados, os controles existem mas não operam.
Não há cadastro, edição ou exclusão de tarefas, nem consumo de API externa,
nem biblioteca ou framework.
