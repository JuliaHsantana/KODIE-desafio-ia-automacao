# Roda Livre — triagem inteligente para oficina de bicicletas

## 1. Apresentação da ideia

O Roda Livre é uma solução de apoio ao atendimento de uma oficina de bicicletas de bairro. A ideia surgiu do desafio técnico KODIE, caso **4.1 — Classificação de mensagens**, e combina uma API com inteligência artificial, uma automação no n8n e uma interface web simples. O objetivo é organizar os recados recebidos e ajudar a equipe a encaminhá-los ao setor adequado, sem substituir a avaliação humana.

## 2. Problema escolhido

Uma oficina recebe mensagens de assuntos diferentes pelo mesmo canal: pedidos de orçamento, agendamentos, dúvidas, reclamações e situações urgentes, como um freio que falhou durante um trajeto. Quando alguém precisa ler e decidir manualmente o destino de cada recado, mensagens importantes podem demorar e os setores podem receber solicitações que não são de sua responsabilidade.

## 3. Solução proposta

O sistema classifica cada mensagem em uma categoria conhecida, estima sua prioridade, cria um resumo e sugere um setor. O n8n usa a categoria para encaminhar a solicitação à fila correspondente. Mensagens fora das categorias previstas seguem para revisão manual.

A IA organiza as informações; a equipe continua responsável por avaliar o caso e decidir como agir. A interface web permite testar o mesmo fluxo sem precisar enviar a requisição manualmente.

## 4. Tecnologias utilizadas

- **Node.js e Express** — API HTTP e servidor da interface web.
- **Google Gemini API** — classificação e resumo das mensagens.
- **n8n** — automação do recebimento, roteamento e resposta pelo webhook.
- **HTML, CSS e JavaScript** — interface responsiva de atendimento.
- **`node:test`** — testes automatizados sem chamadas pagas à IA.

## 5. Funcionamento do sistema

### Fluxo

1. O webhook do n8n recebe `cliente` e `mensagem`.
2. O n8n separa esses campos e chama `POST /classificar` na API.
3. A API envia o texto ao Gemini com instruções para retornar somente categorias permitidas e um resultado estruturado em JSON.
4. A API valida o resultado e devolve a classificação.
5. O n8n direciona a mensagem à fila correspondente e responde ao webhook.

### Contrato da API

Exemplo de entrada:

```json
{
  "cliente": "Marina",
  "mensagem": "O freio dianteiro parou de funcionar no meio da ciclovia."
}
```

Exemplo de resposta:

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

Categorias aceitas: `orcamento`, `agendamento`, `duvida`, `reclamacao` e `socorro`.

| Categoria | Fila sugerida pelo n8n |
|---|---|
| `socorro` | Oficina — socorro |
| `reclamacao` | Balcao — reclamacao |
| `orcamento` | Pecas — orcamento |
| `agendamento` | Oficina — agendamento |
| `duvida` | Balcao — duvida |
| qualquer outro valor | Revisao manual |

### Interface web

A aplicação também serve uma interface responsiva em `http://127.0.0.1:3000`. Nela é possível preencher os dados, carregar mensagens de exemplo, ver o resultado e copiar o JSON. A tela consulta a mesma API `POST /classificar` usada pelo n8n.

### Automação n8n

O fluxo exportado está em [`n8n/fluxo-roda-livre.json`](n8n/fluxo-roda-livre.json). A URL de teste do webhook fica disponível enquanto o n8n está escutando; para usar a URL de produção, publique o fluxo.

## 6. Como executar

### Requisitos

- Node.js 20 ou superior.
- Uma chave de API do Gemini, disponível no [Google AI Studio](https://aistudio.google.com/apikey).

### Instalar e configurar

Na pasta do projeto, instale as dependências e crie seu arquivo local de configuração:

```bash
npm install
copy .env.example .env
```

Abra `.env` e substitua `cole_sua_chave_aqui` pela sua chave. O `.env.example` contém apenas valores ilustrativos e deve permanecer no repositório; o `.env`, com sua chave real, é ignorado pelo Git e não deve ser compartilhado.

O modelo `gemini-3.1-flash-lite` foi validado neste projeto. Se o Gemini indicar alta demanda ou não aceitar o modelo, configure em `GEMINI_MODEL` um modelo disponível na sua conta e reinicie a API.

### Iniciar a API e a interface

```bash
npm start
```

Confira `http://127.0.0.1:3000/health`. O campo `chave_configurada` precisa ser `true`. Acesse `http://127.0.0.1:3000` para usar a interface: informe cliente e mensagem ou escolha um exemplo e clique em **Classificar mensagem**.

Para testar a API diretamente no PowerShell:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3000/classificar -ContentType "application/json" -InFile examples\socorro.json
```

Os testes automatizados não chamam a IA nem consomem a chave:

```bash
npm test
```

### Iniciar e testar o n8n

Em outro terminal:

```bash
npx n8n
```

Abra `http://127.0.0.1:5678`, importe `n8n/fluxo-roda-livre.json` pela opção **Import from File** e mantenha a API em execução. No nó Webhook, clique em **Listen for test event** e envie o exemplo:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:5678/webhook-test/roda-livre -ContentType "application/json" -InFile examples\socorro.json
```

Para chamadas de produção, publique o fluxo e use `/webhook/roda-livre` no lugar de `/webhook-test/roda-livre`.

### Validação e evidências

O fluxo foi publicado no n8n e testado com `examples/socorro.json`: a execução concluiu com sucesso e encaminhou a mensagem para `Oficina — socorro`. Os testes automatizados passaram (2/2).

As capturas de tela e dados da execução estão em [`docs/prints/`](docs/prints/), incluindo [fluxo completo](docs/prints/fluxo-completo.png), [execução bem-sucedida](docs/prints/execucao-sucesso.png) e [interface web no celular](docs/prints/interface-mobile.png). A lista de evidências está em [`docs/prints/LEIA.md`](docs/prints/LEIA.md).

### Estrutura principal

```text
src/server.js      API Express e servidor da interface
src/prompt.js      instruções e valores permitidos para classificação
src/classify.js    chamada ao Gemini e validação do JSON
public/            interface web
n8n/               fluxo de automação exportado
examples/          mensagens de teste
tests/             testes automatizados
```
