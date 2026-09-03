/* ==========================================================================
   estados.js — decide qual das quatro telas está valendo (E3)
   --------------------------------------------------------------------------
   A tela tem quatro estados: carregando, sucesso, vazio e erro.
   Este módulo aplica um deles por vez e garante que nunca sobre tela em
   branco: ou o painel de estado aparece, ou o quadro de cartões aparece.

   Não faz requisição. Recebe o que precisa por parâmetro.
   ========================================================================== */

import { renderizarTarefas } from "./renderizacao.js";

export const ESTADOS = Object.freeze({
  CARREGANDO: "carregando",
  SUCESSO: "sucesso",
  VAZIO: "vazio",
  ERRO: "erro"
});

const ESTADOS_VALIDOS = Object.values(ESTADOS);

/* Textos fixos das telas que não dependem dos dados recebidos. */
const TELAS = {
  [ESTADOS.CARREGANDO]: {
    icone: "⏳",
    titulo: "Aquecendo o caldeirão…",
    detalhe: "Consultando o grimório do laboratório. Isso leva um instante.",
    anuncio: "Carregando as fórmulas do laboratório."
  },
  [ESTADOS.VAZIO]: {
    icone: "🕯️",
    titulo: "O grimório está em branco",
    detalhe:
      "Nenhuma fórmula foi catalogada até agora. Assim que houver tarefas registradas, elas aparecem aqui.",
    anuncio: "Nenhuma fórmula catalogada no laboratório."
  }
};

/* Busca os elementos a cada chamada: o módulo não guarda referências de DOM. */
function obterElementos() {
  return {
    regiaoStatus: document.getElementById("regiao-status"),
    painel: document.getElementById("painel-estado"),
    painelIcone: document.getElementById("painel-icone"),
    painelTitulo: document.getElementById("painel-titulo"),
    painelDetalhe: document.getElementById("painel-detalhe"),
    botaoTentarNovamente: document.getElementById("botao-tentar-novamente"),
    quadro: document.getElementById("quadro"),
    resumo: document.getElementById("resumo-quadro")
  };
}

/* Todo texto entra por textContent. Nunca por innerHTML. */
function preencherPainel(el, { icone, titulo, detalhe }) {
  el.painelIcone.textContent = icone;
  el.painelTitulo.textContent = titulo;
  el.painelDetalhe.textContent = detalhe;
  el.painel.hidden = false;
}

/* A região viva já existe e está vazia no HTML; aqui ela só recebe texto. */
function anunciar(el, texto) {
  el.regiaoStatus.textContent = texto;
}

function plural(quantidade, singular, plural_) {
  return quantidade === 1 ? singular : plural_;
}

/**
 * Aplica um dos quatro estados da tela.
 *
 * @param {"carregando"|"sucesso"|"vazio"|"erro"} estado
 * @param {Array<object>|{mensagem: string, detalhe: string}} [dados]
 *        no sucesso, o array de tarefas;
 *        no erro, o objeto com mensagem e detalhe já escolhidos pelo chamador.
 */
export function renderizarEstado(estado, dados) {
  if (!ESTADOS_VALIDOS.includes(estado)) {
    throw new Error(`Estado desconhecido: "${estado}".`);
  }

  const el = obterElementos();

  /* Ponto de partida comum: esconde tudo e o estado escolhido acende o seu. */
  el.painel.hidden = true;
  el.quadro.hidden = true;
  el.resumo.hidden = true;
  el.botaoTentarNovamente.hidden = true;
  el.painel.dataset.estado = estado;

  if (estado === ESTADOS.ERRO) {
    const { mensagem, detalhe } = dados ?? {};
    preencherPainel(el, {
      icone: "💥",
      titulo: mensagem ?? "O ritual falhou.",
      detalhe: detalhe ?? "Não foi possível carregar as fórmulas."
    });
    el.botaoTentarNovamente.hidden = false;
    anunciar(el, `Erro ao carregar as fórmulas. ${mensagem ?? ""}`.trim());
    return;
  }

  if (estado === ESTADOS.CARREGANDO || estado === ESTADOS.VAZIO) {
    const tela = TELAS[estado];
    preencherPainel(el, tela);
    anunciar(el, tela.anuncio);
    return;
  }

  /* Sucesso: o quadro é desenhado por renderizacao.js e a contagem é dita. */
  const tarefas = Array.isArray(dados) ? dados : [];
  const desenhadas = renderizarTarefas(tarefas);

  el.quadro.hidden = false;
  el.resumo.hidden = false;

  const texto = `${desenhadas} ${plural(desenhadas, "fórmula catalogada", "fórmulas catalogadas")} no laboratório.`;
  el.resumo.textContent = texto;
  anunciar(el, texto);
}
