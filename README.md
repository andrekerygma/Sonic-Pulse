# Sonic Pulse

Sonic Pulse e uma estacao local de text-to-speech com interface em React e backend Express. O projeto gera MP3s a partir de texto usando [`edge-tts`](https://github.com/rany2/edge-tts), sem exigir chave de API, com foco em workflow de roteiro, selecao de vozes, ajuste de renderizacao e biblioteca de clipes.

## O que o app faz

- Gera audio em MP3 localmente a partir de texto.
- Divide textos longos em multiplos trechos e concatena tudo em um unico arquivo final.
- Carrega o catalogo de vozes do `edge-tts` e mantem vozes fallback para a interface.
- Permite ajustar voz, tom e velocidade antes da geracao.
- Exibe estimativa de tempo, progresso e cancelamento da renderizacao.
- Mantem uma biblioteca local com reproducao, download e exclusao de clipes.
- Persiste roteiro, voz selecionada, configuracoes e amostras de estimativa no `localStorage`.
- Importa arquivos `.txt`, `.md` e `.rtf` para acelerar o fluxo de criacao.

## Stack

- Frontend: React 19 + TypeScript + Vite + Tailwind CSS 4
- Backend: Node.js + Express
- Sintese de voz: `edge-tts` executado a partir de uma `.venv` local
- Concatenacao de audio: `ffmpeg` quando disponivel, com fallback interno

## Requisitos

- Node.js 18+ recomendado
- Python 3
- Acesso a internet na maquina local

> Importante: o `edge-tts` nao usa chave de API, mas faz requisicoes ao servico de TTS da Microsoft. Ou seja, a geracao nao e 100% offline.

## Instalacao

1. Instale as dependencias do projeto:

```bash
npm install
```

2. Prepare o ambiente local do `edge-tts`:

```bash
npm run setup:tts
```

Esse comando:

- cria uma `.venv` local na raiz do projeto, se necessario
- atualiza o `pip`
- instala ou atualiza o pacote `edge-tts`

3. Inicie o ambiente de desenvolvimento:

```bash
npm run dev
```

## Como rodar

### Desenvolvimento

```bash
npm run dev
```

O script sobe:

- o frontend Vite em `http://localhost:3000`
- a API local em `http://localhost:3001`

### Produção local

1. Gere o build:

```bash
npm run build
```

2. Suba o servidor em modo de producao:

```bash
NODE_ENV=production npm run start
```

Nesse modo, o Express passa a servir o frontend compilado a partir de `dist/`.

## Scripts disponiveis

| Script | Descricao |
| --- | --- |
| `npm run dev` | Sobe frontend e backend em paralelo para desenvolvimento. |
| `npm run dev:client` | Inicia apenas o frontend Vite na porta `3000`. |
| `npm run dev:server` | Inicia apenas o backend com reload automatico. |
| `npm run setup:tts` | Cria a `.venv` local e instala/atualiza o `edge-tts`. |
| `npm run build` | Gera o build de producao do frontend. |
| `npm run preview` | Faz preview do build do Vite. |
| `npm run start` | Inicia o servidor Express. Em producao, tambem serve `dist/`. |
| `npm run lint` | Executa verificacao de tipos com `tsc --noEmit`. |
| `npm run clean` | Remove a pasta `dist`. |

## Fluxo da aplicacao

### Criar

- Escreva ou cole o roteiro.
- Opcionalmente use "Refinar texto" para limpar o texto localmente.
- Importe conteudo de arquivos `.txt`, `.md` ou `.rtf`.
- Gere o MP3 com a voz e os parametros atuais.

### Renderizacao

- Escolha a voz ativa.
- Ajuste o tom entre `-50Hz` e `+50Hz`.
- Ajuste a velocidade entre `0.5x` e `2x`.
- Acompanhe a estimativa e o progresso da geracao.

### Biblioteca

- Veja os clipes gerados na sessao.
- Reproduza, baixe ou exclua itens.
- Pesquise por titulo, voz, data ou quantidade de segmentos.

### Catalogo de vozes

- Carrega a lista completa retornada pelo `edge-tts`.
- Permite filtrar por nome, codigo, idioma, genero ou tipo.

## Como a geracao funciona

- O backend aceita textos com ate `100.000` caracteres por requisicao.
- Textos maiores que o limite pratico do `edge-tts` sao quebrados automaticamente em blocos de aproximadamente `4.500` caracteres.
- Os blocos sao sintetizados com concorrencia limitada e depois unidos em um unico MP3.
- A API retorna cabecalhos com contagem de segmentos e caracteres processados.
- O frontend usa essas informacoes para montar a biblioteca, estimar tempo e exibir progresso.

## API local

### `GET /api/tts/status`

Retorna se o `edge-tts` esta disponivel e qual comando sera usado.

### `GET /api/tts/voices`

Retorna a lista de vozes disponiveis.

### `POST /api/tts/generate`

Gera o audio e responde com `audio/mpeg`.

Exemplo de payload:

```json
{
  "text": "Seu roteiro aqui",
  "voice": "pt-BR-FranciscaNeural",
  "rate": "+0%",
  "pitch": "+0Hz"
}
```

Cabecalhos relevantes da resposta:

- `X-Sonic-Pulse-Chunk-Count`
- `X-Sonic-Pulse-Character-Count`

## Variaveis de ambiente

O projeto nao exige variaveis de ambiente para rodar localmente, mas o servidor aceita estas opcoes:

| Variavel | Descricao | Padrao |
| --- | --- | --- |
| `PORT` | Porta do servidor Express | `3001` em dev, `3000` em producao |
| `HOST` | Host do servidor Express | `0.0.0.0` |
| `CORS_ORIGINS` | Lista de origens permitidas, separadas por virgula | comportamento automatico conforme ambiente |
| `NODE_ENV` | Controla modo de execucao | `development` |

O arquivo `.env.example` existe apenas como referencia. Nenhuma variavel e obrigatoria no setup padrao.

## Limitacoes importantes

- O app depende do `edge-tts` e, por consequencia, da conectividade com o servico remoto da Microsoft.
- Existe limitacao simples de `5` requisicoes por minuto por IP no endpoint de geracao.
- O frontend aplica timeout de `2 minutos` para evitar geracoes presas.
- O historico textual persiste no navegador, mas os blobs de audio nao sao restaurados apos recarregar a pagina. Depois de um reload, os metadados continuam visiveis, mas pode ser necessario gerar novamente para voltar a ouvir ou baixar.
- `ffmpeg` nao e obrigatorio, mas e recomendado para uma concatenacao de MP3 mais robusta em textos longos.

## Estrutura resumida

```text
.
|-- src/
|   |-- components/   # views e blocos da interface
|   |-- hooks/        # geracao, vozes, persistencia e player
|   |-- utils/        # api, audio, storage, formatacao e texto
|   `-- App.tsx
|-- server/
|   |-- index.mjs     # API Express
|   `-- edge-tts.mjs  # integracao com edge-tts e concatenacao
|-- scripts/
|   |-- dev.mjs
|   `-- setup-edge-tts.mjs
`-- README.md
```

## Troubleshooting rapido

### `edge-tts nao encontrado`

Execute:

```bash
npm run setup:tts
```

### A interface abre, mas a geracao falha

Verifique se:

- o backend esta rodando na porta esperada
- o Python 3 esta instalado corretamente
- a instalacao do `edge-tts` concluiu sem erro
- sua maquina tem acesso a internet

### As vozes nao aparecem

O app usa vozes fallback na interface, mas a listagem completa depende do endpoint `GET /api/tts/voices`.

## Licenca

Defina a licenca do projeto aqui, caso deseje publicar o repositorio com uma licenca explicita.
