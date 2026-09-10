/* ==========================================================================
   app.js — orquestração (E4)
   --------------------------------------------------------------------------
   Aqui mora a regra que sustenta a entrega inteira:

       o estado é a fonte; a tela é uma projeção.

   Nenhum ouvinte desenha nada. Cada ouvinte faz duas coisas, sempre nesta
   ordem: escreve no estado e chama atualizarTela(). Todo o resto — quais
   cartões existem, o que a contagem diz, qual painel acende e até o valor
   dos próprios controles — sai de atualizarTela(), que é o único ponto de
   renderização da aplicação.

   Isso é o que faz os critérios funcionarem combinados em qualquer ordem:
   ninguém filtra o resultado do vizinho, todo ciclo recomeça de
   estado.tarefas.
   ========================================================================== */

import { carregarTarefas, CAMINHO_PADRAO } from "./api.js";
import { estado, limparCriterios, CARREGAMENTO } from "./estado.js";
import { derivarTarefasVisiveis } from "./derivacao.js";
import { renderizarEstado, ESTADOS } from "./estados.js";

/* --------------------------------------------------------------------------
   Elementos estáveis: existem no HTML desde o primeiro byte e nunca são
   substituídos por renderização nenhuma. É por isso que os ouvintes podem
   ser instalados uma única vez, no fim deste arquivo.
   -------------------------------------------------------------------------- */
const formulario = document.getElementById("formulario-filtros");
const campoBusca = document.getElementById("busca-titulo");
const campoStatus = document.getElementById("filtro-status");
const campoOrdenacao = document.getElementById("ordenacao");
const grupoPrioridade = document.getElementById("grupo-prioridade");
const botaoLimpar = document.getElementById("limpar-filtros");
const botaoTentarNovamente = document.getElementById("botao-tentar-novamente");
const quadro = document.getElementById("quadro");

/* --------------------------------------------------------------------------
   Obtenção dos dados
   -------------------------------------------------------------------------- */

/* Permite exercitar os estados sem editar código:
   ?fonte=dados-vazio.json, ?fonte=dados-quebrado.json, ?fonte=nao-existe.json
   Sem o parâmetro, vale o arquivo real. Continua sendo caminho relativo. */
function descobrirFonte() {
  const parametro = new URLSearchParams(window.location.search).get("fonte");
  return parametro ?? CAMINHO_PADRAO;
}

/* Traduz o tipo técnico da falha em um texto que o usuário entende.
   Rede, protocolo e formato produzem mensagens diferentes de propósito:
   cada uma pede uma atitude diferente de quem está lendo. */
function descreverErro(erro) {
  /* Rede: o fetch nem chegou a receber resposta. */
  if (erro.name === "TypeError") {
    return {
      mensagem: "Não foi possível alcançar o laboratório.",
      detalhe:
        "A conexão falhou antes de qualquer resposta chegar. Verifique se você está online e se o servidor continua no ar."
    };
  }

  /* Protocolo: houve resposta, mas com status de erro (404, 500, ...). */
  if (erro.name === "HttpError") {
    return {
      mensagem: `O servidor recusou o pedido (HTTP ${erro.status}).`,
      detalhe:
        erro.status === 404
          ? "O arquivo de fórmulas não foi encontrado no endereço esperado. Confira o caminho de dados.json."
          : `A resposta chegou, mas com status ${erro.status}. O arquivo de fórmulas não pôde ser lido.`
    };
  }

  /* Formato: veio conteúdo, só que ilegível ou fora do contrato combinado. */
  if (erro.name === "SyntaxError" || erro.name === "FormatoInvalidoError") {
    return {
      mensagem: "O grimório chegou ilegível.",
      detalhe: `O conteúdo recebido não é um JSON no formato esperado. ${erro.message}`
    };
  }

  /* Qualquer outra falha ainda produz tela, nunca silêncio. */
  return {
    mensagem: "Algo inesperado interrompeu o ritual.",
    detalhe: erro.message || "Falha sem descrição."
  };
}

/**
 * Único lugar que fala com a rede. Escreve o resultado no estado e delega
 * a tela para atualizarTela(); não escolhe painel nem desenha cartão.
 */
async function iniciar() {
  estado.carregamento = CARREGAMENTO.CARREGANDO;
  estado.erro = null;
  /* O estado de carregando é projetado ANTES do await: é justamente durante
     a espera que ele precisa estar na tela. */
  atualizarTela();

  try {
    /* O array chega e é guardado como veio. Nenhum filtro acontece aqui:
       carregarTarefas() obtém dados, e obter não é decidir o que mostrar. */
    estado.tarefas = await carregarTarefas(descobrirFonte());
    estado.carregamento = CARREGAMENTO.PRONTO;
    /* Recarregar os dados não deve deixar aberto o detalhe de um cartão
       que talvez nem exista mais na lista nova. */
    estado.detalhesAbertos.clear();
  } catch (erro) {
    /* O console ajuda quem desenvolve; a tela é o que o usuário tem. */
    console.error("Falha ao carregar as tarefas:", erro);
    estado.tarefas = [];
    estado.carregamento = CARREGAMENTO.FALHOU;
    estado.erro = descreverErro(erro);
  }

  atualizarTela();
}

/* --------------------------------------------------------------------------
   O ciclo único de atualização
   -------------------------------------------------------------------------- */

/* Os controles também são projeção do estado, não uma segunda fonte da
   verdade. Sem isto, "Limpar filtros" mudaria a tela e deixaria os campos
   preenchidos — duas versões do mesmo fato na mesma página.

   A comparação antes de cada atribuição não é economia: reescrever o value
   de um campo enquanto a pessoa digita pode jogar o cursor para o fim. */
function sincronizarControles() {
  if (campoBusca.value !== estado.busca) {
    campoBusca.value = estado.busca;
  }
  if (campoStatus.value !== estado.status) {
    campoStatus.value = estado.status;
  }
  if (campoOrdenacao.value !== estado.ordenacao) {
    campoOrdenacao.value = estado.ordenacao;
  }

  const radioAtual = grupoPrioridade.querySelector(
    `input[name="prioridade"][value="${estado.prioridade}"]`
  );
  if (radioAtual && !radioAtual.checked) {
    radioAtual.checked = true;
  }
}

/* Uma nova renderização substitui todos os cartões por outros iguais, e por
   um instante o quadro fica vazio. Duas coisas se perdem nessa troca se
   ninguém cuidar delas: o foco do teclado, que cai no <body> quando o
   elemento focado deixa de existir, e a posição de rolagem, que o navegador
   recalcula quando o documento encolhe e cresce.

   Guardar as duas antes e devolvê-las depois não é mover o foco nem rolar a
   página: é impedir que a renderização faça isso. Quem clicou em "Ver
   detalhes" no fim da terceira coluna continua olhando para a terceira
   coluna. */
function preservandoOLugar(desenhar) {
  const ativo = document.activeElement;
  const chave = quadro.contains(ativo) ? ativo.dataset.chaveFoco : null;
  const rolagemX = window.scrollX;
  const rolagemY = window.scrollY;

  desenhar();

  if (chave) {
    const substituto = quadro.querySelector(`[data-chave-foco="${chave}"]`);
    /* preventScroll: o elemento voltou para o mesmo ponto da página; não há
       motivo para o navegador rolar a tela por causa disso. */
    substituto?.focus({ preventScroll: true });
  }

  /* Ler scrollY aqui força o navegador a recalcular o layout, então este é
     o valor real depois da troca. Se ele mudou, devolve o anterior — e se a
     lista encolheu tanto que a posição antiga não existe mais, o próprio
     navegador limita ao fim da página, que é o comportamento certo. */
  if (window.scrollX !== rolagemX || window.scrollY !== rolagemY) {
    window.scrollTo(rolagemX, rolagemY);
  }
}

/**
 * O ÚNICO ponto de renderização. Todo ouvinte termina aqui.
 *
 * A ordem das perguntas importa: carregando e erro falam da obtenção dos
 * dados; vazio fala do grimório; sem-resultado fala dos critérios. Só a
 * última pergunta olha para a lista derivada, e é por isso que resultado
 * vazio nunca pode ser confundido com falha de rede.
 */
function atualizarTela() {
  sincronizarControles();

  if (estado.carregamento === CARREGAMENTO.CARREGANDO) {
    renderizarEstado(ESTADOS.CARREGANDO);
    return;
  }

  if (estado.erro) {
    renderizarEstado(ESTADOS.ERRO, estado.erro);
    return;
  }

  /* Origem vazia: a resposta chegou inteira, só não havia nada dentro.
     Filtrar uma lista vazia não diria nada útil, então nem se filtra. */
  if (estado.tarefas.length === 0) {
    renderizarEstado(ESTADOS.VAZIO);
    return;
  }

  /* A derivação acontece UMA vez por ciclo, e o mesmo array alimenta os
     cartões e a contagem. Duas derivações seriam duas oportunidades de
     discordar. */
  const visiveis = derivarTarefasVisiveis(estado);

  preservandoOLugar(() => {
    if (visiveis.length === 0) {
      renderizarEstado(ESTADOS.SEM_RESULTADO, { total: estado.tarefas.length });
      return;
    }

    renderizarEstado(ESTADOS.SUCESSO, {
      visiveis,
      total: estado.tarefas.length,
      detalhesAbertos: estado.detalhesAbertos
    });
  });
}

/* --------------------------------------------------------------------------
   Ouvintes — instalados uma única vez, em elementos que nunca são trocados.
   Cada um escreve no estado e chama o mesmo atualizarTela().
   -------------------------------------------------------------------------- */

/* Busca: o evento input reage a cada tecla, colar e limpar do campo — o
   evento change só falaria depois que o campo perdesse o foco. */
campoBusca.addEventListener("input", () => {
  estado.busca = campoBusca.value;
  atualizarTela();
});

campoStatus.addEventListener("change", () => {
  estado.status = campoStatus.value;
  atualizarTela();
});

campoOrdenacao.addEventListener("change", () => {
  estado.ordenacao = campoOrdenacao.value;
  atualizarTela();
});

/* Um ouvinte no fieldset inteiro em vez de um por rádio: o evento change
   sobe até aqui, e acrescentar uma potência nova no HTML não pede código. */
grupoPrioridade.addEventListener("change", (evento) => {
  if (evento.target.name !== "prioridade") {
    return;
  }
  estado.prioridade = evento.target.value;
  atualizarTela();
});

/* Limpar filtros devolve o estado ao ponto de partida; a tela e os campos
   voltam junto porque os dois são projeção do mesmo objeto. O foco fica
   onde está: quem clicou no botão continua no botão. */
botaoLimpar.addEventListener("click", () => {
  limparCriterios();
  atualizarTela();
});

/* A busca vive dentro de um <form> para que leitores de tela e navegadores
   a reconheçam como busca. Como a filtragem já é imediata, o Enter não tem
   para onde enviar nada: sem este preventDefault, ele recarregaria a página
   e apagaria o estado inteiro. */
formulario.addEventListener("submit", (evento) => {
  evento.preventDefault();
});

/* Delegação: o ouvinte fica no #quadro, que nunca é substituído. Os botões
   dos cartões, esses sim, são recriados a cada renderização — e continuam
   funcionando porque nunca foi neles que o ouvinte estava. Instalado uma
   vez, no carregamento do módulo: reinstalar a cada ciclo faria a mesma
   ação disparar duas, três, dez vezes. */
quadro.addEventListener("click", (evento) => {
  const botao = evento.target.closest('[data-acao="detalhes"]');
  if (!botao) {
    return;
  }

  /* data-id chega como texto; o id da tarefa é número. Sem a conversão,
     o Set nunca reconheceria o cartão já aberto. */
  const id = Number(botao.dataset.id);

  if (estado.detalhesAbertos.has(id)) {
    estado.detalhesAbertos.delete(id);
  } else {
    estado.detalhesAbertos.add(id);
  }

  atualizarTela();
});

/* Botão de refazer o ritual: recomeça o ciclo inteiro a partir do carregando. */
botaoTentarNovamente.addEventListener("click", iniciar);

/* Módulos ES já são adiados até o HTML estar analisado, então todos os
   elementos consultados acima existem neste ponto. */
iniciar();
