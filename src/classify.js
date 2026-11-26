import { CATEGORIAS, PRIORIDADES, SETORES, montarPrompt } from './prompt.js';

const PERMITIDOS = {
  categoria: CATEGORIAS,
  prioridade: PRIORIDADES,
  setor: SETORES,
};

export function interpretarClassificacao(texto) {
  const limpo = String(texto)
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '');

  let dados;
  try {
    dados = JSON.parse(limpo);
  } catch {
    throw new Error('A IA não devolveu um JSON válido.');
  }

  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
    throw new Error('A IA devolveu um JSON que não é um objeto.');
  }

  for (const campo of Object.keys(PERMITIDOS)) {
    if (!PERMITIDOS[campo].includes(dados[campo])) {
      throw new Error(`A IA devolveu um valor inválido em "${campo}".`);
    }
  }

  if (typeof dados.resumo !== 'string' || dados.resumo.trim().length === 0) {
    throw new Error('A IA não escreveu o resumo.');
  }

  if (typeof dados.precisa_humano !== 'boolean') {
    throw new Error('A IA não informou precisa_humano como true ou false.');
  }

  return {
    categoria: dados.categoria,
    prioridade: dados.prioridade,
    setor: dados.setor,
    resumo: dados.resumo.trim().slice(0, 240),
    precisa_humano: dados.precisa_humano,
  };
}

export async function classificarMensagem({ cliente, mensagem }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'cole_sua_chave_aqui') {
    throw new Error('Configure GEMINI_API_KEY no arquivo .env.');
  }

  const modelo = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`;

  const resposta = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: montarPrompt({ cliente, mensagem }) }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    }),
    signal: AbortSignal.timeout(60_000),
  });

  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    const detalhe = corpo?.error?.message || `HTTP ${resposta.status}`;
    throw new Error(`Gemini recusou a chamada: ${detalhe}`);
  }

  const texto = corpo?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!texto) {
    throw new Error('O Gemini respondeu sem texto.');
  }

  return {
    ...interpretarClassificacao(texto),
    modelo,
  };
}
