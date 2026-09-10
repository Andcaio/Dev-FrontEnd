/* ==========================================================================
   renderizacao.js — desenha tarefas na tela
   --------------------------------------------------------------------------
   renderizarTarefas recebe SEMPRE um array pronto por parâmetro e não sabe
   de onde ele veio: pode ser um literal escrito à mão, o corpo de um JSON
   baixado da rede ou a lista já filtrada e ordenada por derivacao.js.
   É esse desacoplamento que permitiu trocar a origem dos dados na E3 e
   ligar busca, filtros e ordenação na E4 sem reescrever este arquivo.

   Este módulo desenha. Ele não busca, não filtra, não decide estado e não
   trata erro. Também não guarda ouvinte nenhum: quem escuta os cliques dos
   cartões é app.js, por delegação no contêiner que nunca é substituído.
   ========================================================================== */

/* Rótulo humano da prioridade. O dado guarda a chave; a tela mostra o texto. */
const ROTULO_PRIORIDADE = {
  baixa: "Baixa",
  media: "Moderada",
  alta: "Extrema"
};

/* Mesmo par chave/texto dos títulos das colunas, usado nos detalhes. */
const ROTULO_STATUS = {
  "a-fazer": "Grimório / Receitas",
  "em-andamento": "No Caldeirão",
  "em-revisao": "Teste de Pureza",
  concluida: "Poção Pronta"
};

/* "2026-08-20" -> "20/08/2026". Sem new Date() para não sofrer com fuso. */
function formatarPrazo(prazo) {
  const partes = String(prazo).split("-");
  if (partes.length !== 3) {
    return String(prazo);
  }
  const [ano, mes, dia] = partes;
  return `${dia}/${mes}/${ano}`;
}

/* Quantos dias faltam (ou passaram). Compara datas em UTC de propósito:
   a diferença é entre dias do calendário, não entre instantes. */
function situacaoDoPrazo(prazo) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(prazo));
  if (!partes) {
    return "Prazo não informado no grimório.";
  }

  const alvo = Date.UTC(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
  const agora = new Date();
  const hoje = Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const dias = Math.round((alvo - hoje) / 86400000);

  if (dias === 0) {
    return "O prazo termina hoje.";
  }
  if (dias > 0) {
    return `Faltam ${dias} ${dias === 1 ? "dia" : "dias"} para o prazo.`;
  }
  const vencidos = Math.abs(dias);
  return `Prazo vencido há ${vencidos} ${vencidos === 1 ? "dia" : "dias"}.`;
}

/* <p><strong>Rótulo:</strong> valor</p> */
function criarLinha(rotulo, valor) {
  const linha = document.createElement("p");
  const destaque = document.createElement("strong");
  destaque.textContent = `${rotulo}:`;
  linha.append(destaque, ` ${valor}`);
  return linha;
}

/* <p><strong>Prazo:</strong> <time datetime="2026-08-20">20/08/2026</time></p> */
function criarLinhaPrazo(prazo) {
  const linha = document.createElement("p");
  const destaque = document.createElement("strong");
  destaque.textContent = "Prazo:";

  const tempo = document.createElement("time");
  tempo.dateTime = prazo;
  tempo.textContent = formatarPrazo(prazo);

  linha.append(destaque, " ", tempo);
  return linha;
}

/* Selo de cera da potência mágica; o CSS estiliza por [data-prioridade]. */
function criarSeloPrioridade(prioridade) {
  const selo = document.createElement("p");
  selo.dataset.prioridade = prioridade;

  const destaque = document.createElement("strong");
  destaque.textContent = "Potência:";

  selo.append(destaque, ROTULO_PRIORIDADE[prioridade] ?? prioridade);
  return selo;
}

/* <dt>Rótulo</dt><dd>valor</dd> — a lista de definição fica dentro do bloco
   de detalhes, longe dos <p> que o CSS do cartão posiciona por ordem. */
function criarDefinicao(lista, rotulo, valor) {
  const termo = document.createElement("dt");
  termo.textContent = rotulo;

  const descricao = document.createElement("dd");
  descricao.textContent = valor;

  lista.append(termo, descricao);
}

/* O botão que abre e fecha os detalhes. Ele não guarda ouvinte próprio:
   o clique é capturado por delegação lá em app.js. O que ele carrega é
   identidade — data-acao, data-id — para que o ouvinte saiba o que fazer.

   data-chave-foco existe para o teclado: a nova renderização substitui
   este botão por outro igual, e app.js usa a chave para devolver o foco
   ao mesmo lugar em vez de deixá-lo cair no <body>. */
function criarBotaoDetalhes(tarefa, idDetalhes, aberto) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = "botao-cartao";
  botao.dataset.acao = "detalhes";
  botao.dataset.id = String(tarefa.id);
  botao.dataset.chaveFoco = `detalhes-${tarefa.id}`;
  botao.setAttribute("aria-expanded", String(aberto));
  botao.setAttribute("aria-controls", idDetalhes);
  botao.textContent = aberto ? "Ocultar detalhes" : "Ver detalhes";
  return botao;
}

function criarBlocoDetalhes(tarefa, idDetalhes, aberto) {
  const bloco = document.createElement("div");
  bloco.className = "detalhes-cartao";
  bloco.id = idDetalhes;
  bloco.hidden = !aberto;

  const lista = document.createElement("dl");
  criarDefinicao(lista, "Registro", `Fórmula nº ${tarefa.id}`);
  criarDefinicao(lista, "Estágio", ROTULO_STATUS[tarefa.status] ?? tarefa.status);
  criarDefinicao(lista, "Situação do prazo", situacaoDoPrazo(tarefa.prazo));

  bloco.append(lista);
  return bloco;
}

/* A ordem dos <p> importa: o CSS posiciona por :nth-of-type. */
function criarCartao(tarefa, aberto) {
  const item = document.createElement("li");
  item.dataset.id = String(tarefa.id);

  const cartao = document.createElement("article");

  const titulo = document.createElement("h3");
  titulo.textContent = tarefa.titulo;

  const idDetalhes = `detalhes-tarefa-${tarefa.id}`;

  cartao.append(
    titulo,
    criarLinha("Escola de Alquimia", tarefa.disciplina ?? "Não informada"),
    criarLinha("Alquimista", tarefa.responsavel ?? "Sem alquimista designado"),
    criarLinhaPrazo(tarefa.prazo),
    criarSeloPrioridade(tarefa.prioridade),
    criarBotaoDetalhes(tarefa, idDetalhes, aberto),
    criarBlocoDetalhes(tarefa, idDetalhes, aberto)
  );

  item.append(cartao);
  return item;
}

/**
 * Desenha as tarefas nas colunas do quadro.
 *
 * Toda renderização começa esvaziando as quatro colunas: a lista anterior é
 * substituída, nunca acrescentada. É por isso que mudar os filtros dez vezes
 * seguidas não duplica um único cartão.
 *
 * @param {Array<object>} tarefas lista já pronta, vinda de qualquer origem
 * @param {{detalhesAbertos?: Set<number|string>}} [opcoes]
 *        quais cartões devem nascer com os detalhes abertos
 * @returns {number} quantidade de cartões desenhados
 */
export function renderizarTarefas(tarefas, opcoes = {}) {
  const abertos = opcoes.detalhesAbertos ?? new Set();

  const listas = document.querySelectorAll("[data-lista-status]");
  listas.forEach((lista) => lista.replaceChildren());

  let desenhadas = 0;

  tarefas.forEach((tarefa) => {
    const lista = document.querySelector(
      `[data-lista-status="${tarefa.status}"]`
    );
    if (!lista) {
      console.warn(
        `Tarefa ${tarefa.id} tem o status "${tarefa.status}", que não tem coluna no quadro.`
      );
      return;
    }
    lista.append(criarCartao(tarefa, abertos.has(tarefa.id)));
    desenhadas += 1;
  });

  return desenhadas;
}
