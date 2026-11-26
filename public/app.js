const form = document.querySelector('#message-form');
const clientInput = document.querySelector('#client-name');
const messageInput = document.querySelector('#message');
const charCount = document.querySelector('#char-count');
const submitButton = document.querySelector('#submit-button');
const formError = document.querySelector('#form-error');
const connectionStatus = document.querySelector('#connection-status');
const resultStatus = document.querySelector('#result-status');
const emptyState = document.querySelector('#empty-state');
const resultContent = document.querySelector('#result-content');
const errorState = document.querySelector('#error-state');
const resultErrorMessage = document.querySelector('#result-error-message');
const toast = document.querySelector('#toast');

const queues = {
  socorro: 'Oficina — socorro',
  reclamacao: 'Balcao — reclamacao',
  orcamento: 'Pecas — orcamento',
  agendamento: 'Oficina — agendamento',
  duvida: 'Balcao — duvida',
};

const labels = {
  socorro: 'Socorro',
  reclamacao: 'Reclamação',
  orcamento: 'Orçamento',
  agendamento: 'Agendamento',
  duvida: 'Dúvida',
};

const examples = {
  socorro: {
    cliente: 'Marina Costa',
    mensagem: 'O freio dianteiro parou de funcionar no meio da ciclovia. Estou parada e não consigo seguir.',
  },
  reclamacao: {
    cliente: 'Livia Santos',
    mensagem: 'Deixei a bike ontem para trocar o pneu e até agora ninguém me avisou se ficou pronta. O combinado era hoje de manhã.',
  },
  duvida: {
    cliente: 'Caio Oliveira',
    mensagem: 'Quanto tempo a corrente nova costuma durar se eu pedalo todo dia para o trabalho?',
  },
};

let lastResult = null;
let lastRequest = null;
let toastTimer;

function setLoading(loading) {
  submitButton.disabled = loading;
  submitButton.classList.toggle('is-loading', loading);
  submitButton.querySelector('.button-label').textContent = loading
    ? 'Analisando mensagem...'
    : 'Classificar mensagem';
  form.setAttribute('aria-busy', String(loading));
}

function setResultStatus(text, state = '') {
  resultStatus.textContent = text;
  resultStatus.classList.toggle('is-done', state === 'done');
  resultStatus.classList.toggle('is-error', state === 'error');
}

function showError(message) {
  emptyState.hidden = true;
  resultContent.hidden = true;
  errorState.hidden = false;
  resultErrorMessage.textContent = message;
  setResultStatus('Falha na classificação', 'error');
}

function queueFor(category) {
  return queues[category] || 'Revisão manual';
}

function renderResult(result) {
  lastResult = result;
  const category = result.categoria;
  const categoryBadge = document.querySelector('#category-badge');
  const priorityBadge = document.querySelector('#priority-badge');

  categoryBadge.textContent = labels[category] || category;
  priorityBadge.textContent = `Prioridade ${result.prioridade}`;
  priorityBadge.classList.toggle('is-high', result.prioridade === 'alta');
  priorityBadge.classList.toggle('is-low', result.prioridade === 'baixa');

  document.querySelector('#queue-name').textContent = queueFor(category);
  document.querySelector('#result-summary').textContent = result.resumo;
  document.querySelector('#result-sector').textContent = result.setor;
  document.querySelector('#result-human').textContent = result.precisa_humano ? 'Sim, necessário' : 'Não necessário';

  emptyState.hidden = true;
  errorState.hidden = true;
  resultContent.hidden = false;
  setResultStatus('Mensagem classificada', 'done');
}

async function checkConnection() {
  const statusText = connectionStatus.querySelector('.connection-text');

  try {
    const response = await fetch('/health');
    if (!response.ok) {
      throw new Error('A API retornou um erro.');
    }

    const health = await response.json();
    connectionStatus.classList.remove('is-offline');

    if (health.chave_configurada) {
      connectionStatus.classList.add('is-online');
      statusText.textContent = 'Sistema online';
    } else {
      connectionStatus.classList.remove('is-online');
      statusText.textContent = 'Configure a chave';
    }
  } catch {
    connectionStatus.classList.remove('is-online');
    connectionStatus.classList.add('is-offline');
    statusText.textContent = 'Sistema offline';
  }
}

async function classifyMessage() {
  formError.hidden = true;
  const request = {
    cliente: clientInput.value.trim(),
    mensagem: messageInput.value.trim(),
  };
  lastRequest = request;

  if (!request.cliente || !request.mensagem) {
    formError.textContent = 'Preencha o nome do cliente e a mensagem para continuar.';
    formError.hidden = false;
    return;
  }

  emptyState.hidden = true;
  resultContent.hidden = true;
  errorState.hidden = true;
  setResultStatus('Em processamento');
  setLoading(true);

  try {
    const response = await fetch('/classificar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.erro || 'A classificação não foi concluída.');
    }

    renderResult(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha inesperada ao classificar.';
    showError(message);
  } finally {
    setLoading(false);
  }
}

function updateCharCount() {
  charCount.textContent = `${messageInput.value.length} / 2000`;
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('is-visible');
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2200);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  classifyMessage();
});

messageInput.addEventListener('input', updateCharCount);

document.querySelectorAll('[data-example]').forEach((button) => {
  button.addEventListener('click', () => {
    const example = examples[button.dataset.example];
    if (!example) {
      return;
    }

    clientInput.value = example.cliente;
    messageInput.value = example.mensagem;
    updateCharCount();
    formError.hidden = true;
    clientInput.focus();
  });
});

document.querySelector('#copy-result').addEventListener('click', async () => {
  if (!lastResult) {
    return;
  }

  const result = {
    ...lastResult,
    fila: queueFor(lastResult.categoria),
  };

  try {
    await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    showToast('Resultado copiado para a área de transferência.');
  } catch {
    showToast('Não foi possível copiar. Tente novamente no navegador.');
  }
});

document.querySelector('#retry-button').addEventListener('click', () => {
  if (lastRequest) {
    clientInput.value = lastRequest.cliente;
    messageInput.value = lastRequest.mensagem;
    updateCharCount();
  }
  classifyMessage();
});

updateCharCount();
checkConnection();
