/* ==========================================================================
   app.js — orquestração (E3)
   --------------------------------------------------------------------------
   Único lugar que junta as duas metades: pede os dados a api.js e manda
   estados.js desenhar a tela correspondente. Não busca por conta própria e
   não constrói cartão nenhum.

   Não existe await de nível superior aqui: toda a espera acontece dentro
   de iniciar().
   ========================================================================== */

import { carregarTarefas, CAMINHO_PADRAO } from "./api.js";
import { renderizarEstado, ESTADOS } from "./estados.js";

/* Permite exercitar os quatro estados sem editar código:
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
        "A conexão falhou antes de qualquer resposta chegar. Verifique se você está online e se o servidor local continua no ar."
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

async function iniciar() {
  /* O estado de carregando é aplicado ANTES do await: é justamente durante
     a espera que ele precisa estar na tela. */
  renderizarEstado(ESTADOS.CARREGANDO);

  try {
    const tarefas = await carregarTarefas(descobrirFonte());

    /* Vazio é um resultado bem-sucedido, não uma falha: por isso é decidido
       aqui, pelo tamanho da lista, e nunca dentro do catch. */
    if (tarefas.length === 0) {
      renderizarEstado(ESTADOS.VAZIO);
      return;
    }

    renderizarEstado(ESTADOS.SUCESSO, tarefas);
  } catch (erro) {
    /* O console ajuda quem desenvolve; a tela é o que o usuário tem. */
    console.error("Falha ao carregar as tarefas:", erro);
    renderizarEstado(ESTADOS.ERRO, descreverErro(erro));
  }
}

/* Botão de tentar novamente: refaz o ciclo inteiro a partir do carregando. */
document
  .getElementById("botao-tentar-novamente")
  .addEventListener("click", iniciar);

/* Módulos ES já são adiados até o HTML estar analisado, então o DOM
   consultado por estados.js e renderizacao.js existe neste ponto. */
iniciar();
