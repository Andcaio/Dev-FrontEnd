/* ==========================================================================
   renderizacao.js — desenha tarefas na tela (aula 5, inalterado na E3)
   --------------------------------------------------------------------------
   renderizarTarefas recebe SEMPRE um array pronto por parâmetro e não sabe
   de onde ele veio: pode ser um literal escrito à mão, o corpo de um JSON
   baixado da rede ou um array de teste. É esse desacoplamento que permitiu
   trocar a origem dos dados na E3 sem tocar em uma linha deste arquivo.

   Este módulo desenha. Ele não busca, não decide estado e não trata erro.
   ========================================================================== */

/* Rótulo humano da prioridade. O dado guarda a chave; a tela mostra o texto. */
const ROTULO_PRIORIDADE = {
  baixa: "Baixa",
  media: "Moderada",
  alta: "Extrema"
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

/* A ordem dos <p> importa: o CSS posiciona por :nth-of-type. */
function criarCartao(tarefa) {
  const item = document.createElement("li");
  const cartao = document.createElement("article");

  const titulo = document.createElement("h3");
  titulo.textContent = tarefa.titulo;

  cartao.append(
    titulo,
    criarLinha("Escola de Alquimia", tarefa.disciplina ?? "Não informada"),
    criarLinha("Alquimista", tarefa.responsavel ?? "Sem alquimista designado"),
    criarLinhaPrazo(tarefa.prazo),
    criarSeloPrioridade(tarefa.prioridade)
  );

  item.append(cartao);
  return item;
}

/**
 * Desenha as tarefas nas colunas do quadro.
 * @param {Array<object>} tarefas lista já pronta, vinda de qualquer origem
 * @returns {number} quantidade de cartões desenhados
 */
export function renderizarTarefas(tarefas) {
  const listas = document.querySelectorAll("[data-lista-status]");
  listas.forEach((lista) => lista.replaceChildren());

  let desenhadas = 0;

  tarefas.forEach((tarefa) => {
    const lista = document.querySelector(
      `[data-lista-status="${tarefa.status}"]`
    );
    if (!lista) {
      return;
    }
    lista.append(criarCartao(tarefa));
    desenhadas += 1;
  });

  return desenhadas;
}
