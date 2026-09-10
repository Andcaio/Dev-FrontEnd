# Laboratório de Alquimia & Feitiçaria

Gerenciador de tarefas acadêmicas em formato de quadro Kanban, tematizado como
um laboratório de alquimia. Projeto da disciplina de Front-End.

**Aplicação publicada:** <https://andcaio.github.io/Dev-FrontEnd/>

## Entrega atual: E4 — o estado é a fonte, a tela é uma projeção

Na E2 o quadro era HTML escrito à mão. Na E3 os dados passaram a vir de
`dados.json` por `fetch`, com os quatro estados de tela. Na E4 os controles
que existiam desde a E1 finalmente operam — e operam sem que nenhum deles
saiba da existência dos outros.

A regra que sustenta a entrega inteira cabe em uma frase:

> O estado é a fonte; a tela é uma projeção.

Ninguém esconde cartão, ninguém lê o DOM para descobrir o que existe e
ninguém filtra o resultado do vizinho. Cada evento faz duas coisas, sempre
nesta ordem: **escreve no estado** e **chama o mesmo ponto de renderização**.
Cartões, contagem, mensagens e os próprios controles do formulário saem
todos daí — e por isso não têm como discordar entre si.

### O que mudou em relação à E3

| Assunto | E3 | E4 |
| --- | --- | --- |
| Origem da tela | o array devolvido pelo `fetch` | o objeto `estado` |
| Controles | existiam e não faziam nada | busca, dois filtros, ordenação e limpeza |
| Estados de tela | quatro | cinco: entrou **sem-resultado** |
| Contagem | "10 fórmulas catalogadas" | "Mostrando N de M fórmulas" |
| Cartões | estáticos | com detalhes que abrem por evento delegado |

## Arquitetura

```
index.html          controles, região viva, painel de estado e o quadro vazio
dados.json          origem dos dados: objeto raiz com a chave "tarefas"
js/api.js           carregarTarefas(): busca, confere e devolve o array
js/estado.js        o objeto único da aplicação e os valores iniciais
js/derivacao.js     derivarTarefasVisiveis(estado): busca + filtros + ordenação
js/estados.js       renderizarEstado(estado, dados): escolhe qual tela vale
js/renderizacao.js  renderizarTarefas(tarefas): desenha os cartões
js/app.js           orquestra: ouvintes, ciclo de atualização e obtenção
js/dados.js         array da aula 5, aposentado; ninguém mais importa
```

O fluxo tem uma direção só, e ele nunca volta:

```
evento  ->  escreve no estado  ->  atualizarTela()
                                        |
                                        +--> derivarTarefasVisiveis(estado)
                                        |          (array novo, filtrado e ordenado)
                                        +--> renderizarEstado(...)
                                                   |
                                                   +--> renderizarTarefas(lista)
                                                   +--> contagem "N de M"
                                                   +--> região viva (role="status")
```

### As responsabilidades, e o que cada módulo tem proibido fazer

| Módulo | Faz | Não faz |
| --- | --- | --- |
| `api.js` | fetch, confere status e formato | não lê controle, não toca no DOM |
| `estado.js` | descreve o estado e os valores iniciais | não busca, não desenha |
| `derivacao.js` | combina busca, filtros e ordenação | não consulta o DOM, não escreve no estado |
| `renderizacao.js` | monta os cartões | não busca, não filtra, não guarda ouvinte |
| `estados.js` | escolhe qual das cinco telas vale | não faz requisição, não filtra |
| `app.js` | ouve eventos e chama o ciclo | não desenha cartão por conta própria |

### O objeto de estado

```js
export const estado = {
  tarefas: [],            // a lista canônica, como carregarTarefas() devolveu
  busca: "",              // texto digitado na busca
  status: "todos",        // filtro por estágio
  prioridade: "todas",    // filtro por potência
  ordenacao: "grimorio",  // critério de ordenação por prazo
  carregamento: "ocioso", // ocioso | carregando | pronto | falhou
  erro: null,             // { mensagem, detalhe } quando a obtenção falha
  detalhesAbertos: new Set() // quais cartões estão expandidos, por id
};
```

Repare no que **não** está aí: a lista filtrada. Ela é recalculada a cada
ciclo por `derivarTarefasVisiveis(estado)`, que devolve um array novo e nunca
encosta em `estado.tarefas`. Guardar a lista visível criaria uma segunda fonte
da verdade — e duas fontes sempre acabam discordando na hora em que ninguém
está olhando.

`estado.detalhesAbertos` não é uma segunda lista de tarefas: é uma preferência
de exibição, guardada por `id`. É o que faz um cartão continuar aberto depois
de uma nova renderização.

## Os cinco estados de tela

| Estado | Quando acontece | O que aparece |
| --- | --- | --- |
| Carregando | aplicado antes do `await`, enquanto a resposta não chega | painel com o caldeirão aquecendo |
| Sucesso | a lista derivada tem pelo menos uma tarefa | as colunas com os cartões e "Mostrando N de M" |
| Vazio | a resposta chegou, mas `tarefas.length === 0` | painel dizendo que o grimório está em branco |
| Sem resultado | há tarefas, mas nenhuma atende aos critérios | painel que orienta a ajustar ou limpar os filtros |
| Erro | rede, protocolo ou formato falharam | painel vermelho com a causa e o botão de refazer |

**Vazio e sem-resultado dizem coisas diferentes de propósito.** O primeiro fala
do grimório, o segundo fala dos critérios; trocar um pelo outro manda a pessoa
procurar o problema no lugar errado. E nenhum dos dois passa pelo `catch`:
resultado vazio é decidido pelo tamanho da lista derivada, porque não achar
nada é uma resposta, não uma falha.

## Como rodar localmente

A página precisa ser servida por HTTP: com `file:` o `fetch` de um arquivo
local é bloqueado pela política de mesma origem.

```sh
python -m http.server 8000
# depois abra http://localhost:8000
```

No VS Code, a extensão Live Server também serve.

## Como verificar

Os testes de rede continuam disponíveis pela URL, sem editar código: o
parâmetro `?fonte=` troca apenas o caminho passado a `carregarTarefas()`.

| Teste | Como reproduzir | Resultado esperado |
| --- | --- | --- |
| Fonte original intacta | filtrar e ordenar de todo jeito, depois clicar em "Limpar filtros" | os 10 cartões voltam na ordem original |
| Critérios combinados | digitar parte de um título, escolher estágio e potência; repetir mudando os controles em outra ordem | o mesmo conjunto de critérios dá o mesmo resultado |
| Limpeza | ativar tudo e clicar em "Limpar filtros" | campos **e** tela voltam juntos ao início |
| Resultado vazio | buscar por algo que não existe | painel de sem-resultado, "Mostrando 0 de 10", sem erro de rede |
| Nova renderização | mudar os filtros dez vezes e clicar em "Ver detalhes" | abre uma única vez, sem cartão duplicado |
| Teclado | navegar só com Tab, digitar na busca, acionar "Limpar filtros" | o foco fica visível e nunca salta sozinho |
| Carregando | DevTools > Network > throttling **Slow 4G**, recarregar | o painel do caldeirão fica legível durante a espera |
| Vazio | `?fonte=dados-vazio.json` | painel do grimório em branco, e não uma tela de erro |
| Erro de protocolo | `?fonte=nao-existe.json` | "O servidor recusou o pedido (HTTP 404)" |
| Erro de rede | DevTools > Network > throttling **Offline**, recarregar | "Não foi possível alcançar o laboratório" |
| Erro de formato | `?fonte=dados-quebrado.json` | "O grimório chegou ilegível" |
| Largura | modo responsivo de 320px até uma tela larga | nada transborda e nada exige rolagem horizontal |

> **Aviso sobre `dados-quebrado.json`:** a vírgula sobrando na última linha do
> array **está errada de propósito** — é ela que torna o arquivo um JSON
> inválido e permite testar o erro de formato. Não conserte a vírgula: fazer
> isso apaga o teste, porque o arquivo passa a carregar normalmente.
> O `dados-vazio.json` existe pelo mesmo motivo, para o estado de origem vazia.

## Acessibilidade

- `#regiao-status` tem `role="status"` e `aria-live="polite"`, está no HTML
  desde o início e nasce vazio; só o JavaScript escreve nele. A cada ciclo ele
  recebe "Mostrando N de M fórmulas" ou a mensagem do estado da vez.
- **A atualização dos resultados não move o foco.** Escrever na região viva não
  desloca o cursor de teclado, e quando uma nova renderização substitui o botão
  de um cartão, `app.js` devolve o foco ao botão equivalente pelo atributo
  `data-chave-foco`. Devolver o foco ao mesmo lugar não é movê-lo: é impedir
  que a renderização o mova.
- Nenhum `tabindex` positivo. A ordem de tabulação é a ordem do HTML.
- Os botões de detalhe informam o próprio estado por `aria-expanded`, e o
  triângulo do CSS acompanha esse atributo — o visual e o anunciado não divergem.
- Todo texto entra por `textContent`, nunca por `innerHTML`.
- `aria-live="assertive"` não é usado: a troca de estado informa, não interrompe.
- A animação do ícone de carregando respeita `prefers-reduced-motion`.

## Publicação

Publicado pelo **GitHub Pages**, a partir da branch padrão (`main`) e da pasta
raiz (`/`). Todos os caminhos do projeto são relativos (`dados.json`,
`style.css`, `js/app.js`), então a mesma árvore de arquivos funciona em
`http://localhost:8000/` e em `https://andcaio.github.io/Dev-FrontEnd/`.

O arquivo vazio `.nojekyll` desliga o processamento Jekyll do GitHub Pages:
sem ele, o Pages pode ignorar arquivos e pastas conforme suas próprias regras,
e o projeto não tem nenhum motivo para passar por um gerador de sites.

Para conferir a versão pública: abra a URL em uma janela anônima, vá em
DevTools > Network e recarregue. `dados.json`, `style.css` e os seis módulos
JavaScript devem responder **200**. Em DevTools > Console não deve haver
nenhum erro. Se funcionar local e falhar público, o suspeito de sempre é
diferença entre maiúsculas e minúsculas nos caminhos: o servidor do Pages
diferencia, o Windows não.

## Fora do escopo desta entrega

Sem framework ou biblioteca de interface, sem bundler ou processo de build,
sem API externa ou `json-server`. Não há cadastro, edição ou exclusão de
tarefas, nem persistência em banco ou `localStorage`, nem paginação,
autenticação ou arrastar e soltar. Nenhum Redux, reducer, store genérica ou
sistema próprio de reatividade: o "ciclo" desta entrega é uma função chamada
`atualizarTela()`, e ela cabe em uma tela de editor.
