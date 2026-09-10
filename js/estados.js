/* ==========================================================================
   estados.js — decide qual tela está valendo
   --------------------------------------------------------------------------
   Na E3 a tela tinha quatro estados. A E4 acrescentou o quinto, e ele é o
   mais fácil de confundir com um erro: "sem resultado". O grimório chegou
   inteiro, a rede funcionou, nada falhou — só que os critérios escolhidos
   não encontram nenhuma fórmula. Isso não é falha, é resposta, e por isso
   tem painel próprio, mensagem própria e nunca passa pelo catch.

   Este módulo aplica exatamente um estado por vez e garante que nunca sobre
   tela em branco: ou o painel aparece, ou o quadro de cartões aparece.

   Não faz requisição, não filtra e não lê controles. Recebe tudo por
   parâmetro, já decidido por quem chamou.
   ========================================================================== */

import { renderizarTarefas } from "./renderizacao.js";

export const ESTADOS = Object.freeze({
  CARREGANDO: "carregando",
  SUCESSO: "sucesso",
  VAZIO: "vazio",
  SEM_RESULTADO: "sem-resultado",
  ERRO: "erro"
});

const ESTADOS_VALIDOS = Object.values(ESTADOS);

/* Textos fixos das telas que não dependem dos dados recebidos.
   Vazio e sem-resultado dizem coisas diferentes de propósito: o primeiro
   fala do laboratório, o segundo fala dos critérios. Trocar um pelo outro
   manda a pessoa procurar o problema no lugar errado. */
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

/* A região viva já existe e está vazia no HTML; aqui ela só recebe texto.
   Escrever nela não move o foco de lugar nenhum: o leitor de tela anuncia
   a mudança sem interromper quem está digitando na busca. */
function anunciar(el, texto) {
  el.regiaoStatus.textContent = texto;
}

function plural(quantidade, singular, plural_) {
  return quantidade === 1 ? singular : plural_;
}

/* "3 de 10 fórmulas" — a mesma frase alimenta a contagem visível e o
   anúncio da região viva, para que ninguém receba números diferentes. */
function fraseDeContagem(visiveis, total) {
  return `Mostrando ${visiveis} de ${total} ${plural(total, "fórmula", "fórmulas")}.`;
}

/**
 * Aplica um dos cinco estados da tela.
 *
 * @param {"carregando"|"sucesso"|"vazio"|"sem-resultado"|"erro"} estado
 * @param {object} [dados]
 *        sucesso:       { visiveis: Array<object>, total: number, detalhesAbertos?: Set }
 *        sem-resultado: { total: number }
 *        erro:          { mensagem: string, detalhe: string } já escolhidos pelo chamador
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

  if (estado === ESTADOS.SEM_RESULTADO) {
    const total = dados?.total ?? 0;
    preencherPainel(el, {
      icone: "🔎",
      titulo: "Nenhuma fórmula corresponde à busca",
      detalhe:
        `${total} ${plural(total, "fórmula catalogada continua", "fórmulas catalogadas continuam")} no grimório; ` +
        "nenhuma delas atende aos critérios atuais. Ajuste a busca, o estágio ou a potência — " +
        'ou use o botão "Limpar filtros" para ver todas de novo.'
    });
    /* O quadro fica escondido, mas a contagem continua visível: é ela que
       mostra, em número, que o filtro zerou a lista sem perder o total. */
    el.resumo.hidden = false;
    el.resumo.textContent = fraseDeContagem(0, total);
    anunciar(el, `Nenhuma fórmula encontrada. ${fraseDeContagem(0, total)}`);
    return;
  }

  /* Sucesso: o quadro é desenhado por renderizacao.js a partir da lista já
     derivada, e a contagem sai dessa mesma lista — cartões e número nunca
     saem de fontes diferentes. */
  const visiveis = Array.isArray(dados?.visiveis) ? dados.visiveis : [];
  const total = dados?.total ?? visiveis.length;

  renderizarTarefas(visiveis, { detalhesAbertos: dados?.detalhesAbertos });

  el.quadro.hidden = false;
  el.resumo.hidden = false;

  const texto = fraseDeContagem(visiveis.length, total);
  el.resumo.textContent = texto;
  anunciar(el, texto);
}
