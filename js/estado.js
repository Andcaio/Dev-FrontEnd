/* ==========================================================================
   estado.js — a fonte única da verdade (E4)
   --------------------------------------------------------------------------
   Um objeto, um lugar. Tudo o que aparece na tela é uma projeção daqui:
   os cartões, a contagem, a mensagem do painel e até o valor dos próprios
   controles do formulário.

   O que este módulo deliberadamente NÃO guarda é a lista filtrada.
   Ela é recalculada a cada ciclo por derivacao.js. Guardar a lista visível
   criaria uma segunda fonte da verdade — e duas fontes sempre acabam
   discordando na hora em que ninguém está olhando.

   Este módulo não faz requisição e não encosta no DOM: ele só descreve.
   ========================================================================== */

/* As quatro situações possíveis da obtenção dos dados. Ficam separadas do
   erro em si: "falhou" diz que parou, estado.erro diz por quê. */
export const CARREGAMENTO = Object.freeze({
  OCIOSO: "ocioso",
  CARREGANDO: "carregando",
  PRONTO: "pronto",
  FALHOU: "falhou"
});

/* Valores iniciais dos quatro critérios de exibição.
   O botão "Limpar filtros" não inventa valores: ele copia deste objeto,
   que por isso é congelado — ninguém pode redefinir o ponto de partida. */
export const CRITERIOS_INICIAIS = Object.freeze({
  busca: "",
  status: "todos",
  prioridade: "todas",
  ordenacao: "grimorio"
});

/* O objeto único da aplicação. Cada ouvinte escreve aqui e só aqui. */
export const estado = {
  /* A lista canônica, exatamente como carregarTarefas() a devolveu.
     Nada além de iniciar() escreve neste campo, e nada o reordena. */
  tarefas: [],

  /* Critérios de exibição — o que a pessoa pediu para ver. */
  busca: CRITERIOS_INICIAIS.busca,
  prioridade: CRITERIOS_INICIAIS.prioridade,
  status: CRITERIOS_INICIAIS.status,
  ordenacao: CRITERIOS_INICIAIS.ordenacao,

  /* Situação da obtenção dos dados e a falha atual (null quando não há). */
  carregamento: CARREGAMENTO.OCIOSO,
  erro: null,

  /* Quais cartões estão com os detalhes abertos, por id.
     Não é uma lista de tarefas: é uma preferência de exibição, e é o que
     permite que uma nova renderização não feche o cartão que a pessoa
     acabou de abrir. */
  detalhesAbertos: new Set()
};

/**
 * Devolve os quatro critérios ao ponto de partida.
 * Mexe apenas nos critérios: as tarefas obtidas e a situação do
 * carregamento não têm nada a ver com "limpar filtros".
 */
export function limparCriterios() {
  Object.assign(estado, CRITERIOS_INICIAIS);
}
