/* ==========================================================================
   derivacao.js — do estado para a lista visível (E4)
   --------------------------------------------------------------------------
   Uma função pura no meio da aplicação: recebe o estado, devolve um array
   novo. Não consulta o DOM, não lê controles, não escreve no estado e não
   reordena estado.tarefas.

   É por isso que os critérios podem ser alterados em qualquer ordem e o
   resultado é sempre o mesmo: cada ciclo recomeça do array original, não do
   resultado do ciclo anterior.
   ========================================================================== */

export const ORDENACOES = Object.freeze({
  GRIMORIO: "grimorio",
  PRAZO_CRESCENTE: "prazo-crescente",
  PRAZO_DECRESCENTE: "prazo-decrescente"
});

/* Minúsculas e sem acento dos dois lados da comparação: "Poção" encontra
   "pocao", e "ELIXIR" encontra "Elixir". A busca compara texto, não grafia. */
function normalizar(texto) {
  return String(texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/* Os valores que significam "não filtre por este campo". */
const CRITERIO_TODOS = Object.freeze({ status: "todos", prioridade: "todas" });

/* Só as três formas de comparar. Cada critério é uma pergunta isolada, e é
   isso que faz cada filtro funcionar sozinho e todos funcionarem juntos. */
function casaComBusca(tarefa, termo) {
  return termo === "" || normalizar(tarefa.titulo).includes(termo);
}

function casaComStatus(tarefa, status) {
  return status === CRITERIO_TODOS.status || tarefa.status === status;
}

function casaComPrioridade(tarefa, prioridade) {
  return prioridade === CRITERIO_TODOS.prioridade || tarefa.prioridade === prioridade;
}

/* "2026-08-20" -> "2026-08-20". O formato ISO já ordena corretamente como
   texto, então não é preciso construir Date (e nem sofrer com fuso horário).
   Prazo ausente ou fora do formato devolve "", tratado como "sem prazo". */
function chaveDePrazo(prazo) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(prazo)) ? String(prazo) : "";
}

/* sentido: 1 para o prazo mais próximo primeiro, -1 para o mais distante. */
function compararPorPrazo(sentido) {
  return (a, b) => {
    const prazoA = chaveDePrazo(a.prazo);
    const prazoB = chaveDePrazo(b.prazo);

    /* Sem prazo cai para o fim da lista nos dois sentidos: é ausência de
       informação, não uma data muito grande nem muito pequena. */
    if (prazoA === "" && prazoB === "") return 0;
    if (prazoA === "") return 1;
    if (prazoB === "") return -1;
    if (prazoA === prazoB) return 0;

    return (prazoA < prazoB ? -1 : 1) * sentido;
  };
}

const COMPARADORES = {
  [ORDENACOES.PRAZO_CRESCENTE]: compararPorPrazo(1),
  [ORDENACOES.PRAZO_DECRESCENTE]: compararPorPrazo(-1)
  /* ORDENACOES.GRIMORIO não tem comparador de propósito: "ordem do grimório"
     é a ordem em que as tarefas chegaram, então não se ordena nada. */
};

/**
 * Combina busca, filtros e ordenação e devolve a lista visível.
 *
 * @param {object} estado o objeto único da aplicação
 * @returns {Array<object>} um array NOVO; estado.tarefas continua intacto
 */
export function derivarTarefasVisiveis(estado) {
  const termo = normalizar(estado.busca).trim();

  /* filter() lê o array original e devolve outro: estado.tarefas nunca é
     tocado, nem na ordem nem no tamanho. */
  const filtradas = estado.tarefas.filter(
    (tarefa) =>
      casaComBusca(tarefa, termo) &&
      casaComStatus(tarefa, estado.status) &&
      casaComPrioridade(tarefa, estado.prioridade)
  );

  const comparar = COMPARADORES[estado.ordenacao];
  if (!comparar) {
    return filtradas;
  }

  /* sort() ordena no lugar, por isso ele só encosta em uma cópia. Chamar
     estado.tarefas.sort() destruiria a ordem original para sempre — e o
     original é a única coisa que garante que "Limpar filtros" funcione.
     A ordenação nativa é estável, então empates de prazo preservam a ordem
     do grimório em vez de embaralhar a cada ciclo. */
  return [...filtradas].sort(comparar);
}
