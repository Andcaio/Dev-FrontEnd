/* ==========================================================================
   api.js — obtenção dos dados (E3)
   --------------------------------------------------------------------------
   Responsabilidade única: buscar, conferir e devolver o array de tarefas.
   Não toca no DOM, não escolhe mensagem de tela e não decide estado.
   Quando algo dá errado, lança um Error com um name que o chamador usa
   para distinguir o tipo de falha.
   ========================================================================== */

/* Caminho relativo: o JSON é servido pela mesma origem da página. */
export const CAMINHO_PADRAO = "dados.json";

/* Falha de protocolo: a resposta chegou, mas com status fora da faixa 2xx. */
function erroDeProtocolo(resposta, caminho) {
  const erro = new Error(
    `O servidor respondeu ${resposta.status} (${resposta.statusText || "sem descrição"}) para "${caminho}".`
  );
  erro.name = "HttpError";
  erro.status = resposta.status;
  return erro;
}

/* Falha de formato: o JSON é válido, mas não tem o formato combinado. */
function erroDeFormato(mensagem) {
  const erro = new Error(mensagem);
  erro.name = "FormatoInvalidoError";
  return erro;
}

/**
 * Busca as tarefas no arquivo JSON servido pela mesma origem.
 *
 * @param {string} [caminho] caminho relativo do arquivo a buscar
 * @returns {Promise<Array<object>>} o array de tarefas
 * @throws {TypeError} quando a rede falha (offline, DNS, origem inalcançável)
 * @throws {Error} name "HttpError" quando o status não é ok (404, 500, ...)
 * @throws {SyntaxError} quando o corpo não é JSON válido
 * @throws {Error} name "FormatoInvalidoError" quando falta a chave "tarefas"
 */
export async function carregarTarefas(caminho = CAMINHO_PADRAO) {
  /* 1. Rede. Se a requisição não sai do lugar, o fetch rejeita com TypeError. */
  const resposta = await fetch(caminho);

  /* 2. Protocolo. Um 404 devolve uma resposta perfeitamente legível contendo
        uma página de erro: sem esta conferência, o passo 3 leria lixo. */
  if (!resposta.ok) {
    throw erroDeProtocolo(resposta, caminho);
  }

  /* 3. Formato. Ler o corpo também é assíncrono, por isso o await. */
  const documento = await resposta.json();

  /* 4. Contrato. O documento raiz é um objeto com a chave "tarefas". */
  if (documento === null || typeof documento !== "object" || Array.isArray(documento)) {
    throw erroDeFormato(
      'O documento raiz do JSON deveria ser um objeto com a chave "tarefas".'
    );
  }

  if (!Array.isArray(documento.tarefas)) {
    throw erroDeFormato('A chave "tarefas" está ausente ou não é uma lista.');
  }

  /* Devolve o array puro. Quem chamou decide o que fazer com ele. */
  return documento.tarefas;
}
