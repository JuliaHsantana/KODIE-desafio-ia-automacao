import express from 'express';
import { classificarMensagem } from './classify.js';

const app = express();
const porta = Number(process.env.PORT) || 3000;

app.use(express.json());

app.get('/health', (_req, res) => {
  const chave = process.env.GEMINI_API_KEY;
  res.json({
    ok: true,
    servico: 'roda-livre',
    chave_configurada: Boolean(chave && chave !== 'cole_sua_chave_aqui'),
  });
});

app.post('/classificar', async (req, res) => {
  const cliente = typeof req.body?.cliente === 'string' ? req.body.cliente.trim() : '';
  const mensagem = typeof req.body?.mensagem === 'string' ? req.body.mensagem.trim() : '';

  if (!cliente || cliente.length > 80) {
    res.status(400).json({ erro: 'Informe "cliente" com até 80 caracteres.' });
    return;
  }

  if (!mensagem || mensagem.length > 2000) {
    res.status(400).json({ erro: 'Informe "mensagem" com até 2000 caracteres.' });
    return;
  }

  try {
    const classificacao = await classificarMensagem({ cliente, mensagem });
    res.status(200).json({
      cliente,
      ...classificacao,
    });
  } catch (erro) {
    const texto = erro instanceof Error ? erro.message : 'Falha ao classificar.';
    const status = texto.startsWith('Configure GEMINI_API_KEY') ? 500 : 502;
    res.status(status).json({ erro: texto });
  }
});

app.listen(porta, '127.0.0.1', () => {
  console.log(`API da Roda Livre em http://127.0.0.1:${porta}`);
});
