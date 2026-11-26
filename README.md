# Roda Livre — classificação de mensagens da oficina

Desafio técnico KODIE, caso **4.1 — Classificação de mensagens**.

Uma oficina de bicicletas de bairro recebe recados de clientes no mesmo canal: preço de peça, horário, dúvida, reclamação e gente parada na rua porque o freio falhou. Hoje alguém lê um por um e decide para onde vai. Este projeto faz a primeira triagem com IA e encaminha a mensagem no n8n.

Reescreva a apresentação com as suas palavras antes de entregar. O avaliador espera que você consiga explicar o fluxo.

## Problema escolhido

Caso 4.1. As mensagens chegam misturadas. Sem uma categoria fixa, o balcão, a oficina e o estoque de peças recebem assunto que não é deles.

## Solução

1. O n8n recebe a mensagem em um Webhook.
2. Um nó separa `cliente` e `mensagem`.
3. Outro nó chama `POST /classificar` na API Express.
4. A API manda o texto ao Gemini com um prompt que só aceita categorias da oficina e exige JSON.
5. O n8n lê `categoria` e coloca a mensagem na fila correspondente.
6. O último nó devolve o JSON para quem chamou o Webhook.

A IA não decide o conserto. Ela só organiza o recado.

## Tecnologias

- Node.js e Express
- API do Google Gemini, chamada por HTTP
- n8n
- Interface web responsiva, servida pela própria API
- Testes com `node:test`

## Como o sistema funciona

Entrada:

```json
{
  "cliente": "Marina",
  "mensagem": "O freio dianteiro parou de funcionar no meio da ciclovia."
}
```

Saída da API:

```json
{
  "cliente": "Marina",
  "categoria": "socorro",
  "prioridade": "alta",
  "setor": "oficina",
  "resumo": "Cliente parada na ciclovia com freio dianteiro inoperante",
  "precisa_humano": true,
  "modelo": "gemini-3.1-flash-lite"
}
```

Categorias: `orcamento`, `agendamento`, `duvida`, `reclamacao`, `socorro`.

Filas do n8n:

| Categoria | Fila |
|---|---|
| socorro | Oficina — socorro |
| reclamacao | Balcao — reclamacao |
| orcamento | Pecas — orcamento |
| agendamento | Oficina — agendamento |
| duvida | Balcao — duvida |
| qualquer outro valor | Revisao manual |

## Como executar

Requisitos: Node.js 20+ e uma chave do Gemini em [Google AI Studio](https://aistudio.google.com/apikey).

Na pasta do projeto:

```bash
npm install
copy .env.example .env
```

Abra o `.env` e troque `cole_sua_chave_aqui` pela sua chave. Não envie esse arquivo ao GitHub. O modelo `gemini-3.1-flash-lite` foi validado neste projeto; se o Google informar alta demanda, tente novamente mais tarde ou configure outro modelo disponível na sua conta.

O `.env.example` contém apenas valores de exemplo e deve ser versionado. O `.env` contém sua chave real, é ignorado pelo Git e não deve ser compartilhado.

Terminal 1, a API:

```bash
npm start
```

Confira `http://127.0.0.1:3000/health`. O campo `chave_configurada` precisa ser `true`.

Abra `http://127.0.0.1:3000` para usar a interface: informe cliente e mensagem, ou escolha um exemplo, e clique em **Classificar mensagem**. O resultado mostra categoria, prioridade, resumo, setor, necessidade de revisão humana e fila sugerida. A tela usa o mesmo `POST /classificar` que o n8n.

Teste direto na API, em outro terminal:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3000/classificar -ContentType "application/json" -InFile examples\socorro.json
```

Testes que não gastam a chave (só conferem se o JSON da IA seria aceito):

```bash
npm test
```

Terminal 2, o n8n:

```bash
npx n8n
```

Abra `http://127.0.0.1:5678`, importe `n8n/fluxo-roda-livre.json` em **Import from File** e deixe a API rodando. Para testar sem publicar o fluxo, no nó Webhook clique em **Listen for test event** e envie:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:5678/webhook-test/roda-livre -ContentType "application/json" -InFile examples\socorro.json
```

A URL de teste só existe enquanto o n8n está escutando. Para usar a URL de produção, publique o fluxo no n8n; o endereço passa a ser `/webhook/roda-livre`, sem `-test`.

Se o nome do modelo no `.env` for recusado, troque `GEMINI_MODEL` pelo nome que o AI Studio mostrar e reinicie a API.

## Validação e evidências

O fluxo foi publicado no n8n e testado pelo webhook de produção com `examples/socorro.json`. A execução terminou com sucesso em 1,836 s e encaminhou a mensagem para `Oficina — socorro`. Os testes automatizados também passaram (2/2).

As evidências estão em `docs/prints/`:

- [Fluxo completo](docs/prints/fluxo-completo.png) e [execução bem-sucedida](docs/prints/execucao-sucesso.png).
- [Interface web no celular](docs/prints/interface-mobile.png). A interface também funciona em telas grandes e está disponível em `http://127.0.0.1:3000` enquanto a API estiver rodando.
- Configurações: [Webhook](docs/prints/config-webhook.png), [Separar campos](docs/prints/config-separar-campos.png), [Chamar API](docs/prints/config-chamar-api.png), [Escolher fila](docs/prints/config-escolher-fila.png), filas de [socorro](docs/prints/config-fila-socorro.png), [reclamação](docs/prints/config-fila-reclamacao.png), [orçamento](docs/prints/config-fila-orcamento.png), [agendamento](docs/prints/config-fila-agendamento.png), [dúvida](docs/prints/config-fila-duvida.png), [revisão manual](docs/prints/config-fila-revisar.png) e [Responder](docs/prints/config-responder.png).
- Dados da execução: entrada do webhook em [tabela](docs/prints/dados-entrada-webhook.png) e [JSON](docs/prints/json-entrada-webhook.png), [classificação da API](docs/prints/dados-api-classificacao.png), [encaminhamento](docs/prints/dados-encaminhamento-socorro.png) e [resposta final](docs/prints/dados-resposta-final.png).

Antes de entregar, reescreva a apresentação inicial com suas próprias palavras. Depois, publique o repositório no GitHub e envie o link. O `.env` fica de fora; o `.env.example` fica no repositório. O checklist das imagens está em [docs/prints/LEIA.md](docs/prints/LEIA.md).

## Arquivos

```text
src/server.js      recebe POST /classificar
src/prompt.js      instruções e valores permitidos
src/classify.js    chama o Gemini e confere o JSON
public/            interface web servida pela API
n8n/fluxo-roda-livre.json
examples/          mensagens para testar
tests/             teste do interpretador, sem chamar a IA
```
