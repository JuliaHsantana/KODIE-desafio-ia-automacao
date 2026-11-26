import assert from 'node:assert/strict';
import test from 'node:test';
import { interpretarClassificacao } from '../src/classify.js';

test('aceita o JSON da oficina', () => {
  const resultado = interpretarClassificacao(`{
    "categoria": "socorro",
    "prioridade": "alta",
    "setor": "oficina",
    "resumo": "Freio dianteiro falhou no caminho.",
    "precisa_humano": true
  }`);

  assert.equal(resultado.categoria, 'socorro');
  assert.equal(resultado.prioridade, 'alta');
  assert.equal(resultado.precisa_humano, true);
});

test('recusa categoria inventada', () => {
  assert.throws(
    () =>
      interpretarClassificacao(
        '{"categoria":"elogio","prioridade":"baixa","setor":"balcao","resumo":"ok","precisa_humano":false}'
      ),
    /categoria/
  );
});
