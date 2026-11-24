# [nome-do-repo]

Vídeos verticais do canal **[Nome do canal]** ([@seucanal], TikTok e Instagram): [tema do canal], 100% gerados com IA, sem rosto. Público: [público].

## Fontes da verdade
- **Planilha de pautas e vídeos:** [link]. Aba **Pautas**: código [PRE]-xxx, tema, gancho, data prevista, tipo, pontos e o que confirmar. Aba **Vídeos**: um registro por vídeo produzido, com o mesmo ID da pauta.
- **Identidade do canal:** `canal.json` (handle, chamada final, cores, selo, voz e estilo da narração).

## Regras de conteúdo
- [Idioma]. Narrador em terceira pessoa. Tom: [tom]. Tema sensível: sem humor (`"sensivel": true` no roteiro, narração em tom sério).
- Rigor: datas, números e citações só com certeza e com fonte. Checar os fatos na web antes de fechar o roteiro e listar em `confirmar` o que deve ser checado. Temas atuais: os dois lados.
- **Acima de 1 minuto.** Mirar 61–70 s, ~215–225 palavras de fala (o corte de silêncios encurta; conferir o tempo real). 7–9 cenas: gancho, virada, explicação, contexto, "o que muita gente não sabe", fechamento com pergunta de opinião + convite para seguir.
- **Gancho** de até ~8 palavras: pergunta com "você" ou contradição sobre algo conhecido. Não abrir com data.
- **Capa** no primeiro frame (`capa`, com `[trecho]` destacado), visível por 0,4 s com a narração já rodando. `capa_cor`: `escura`, `fundo` ou `clara` (revezar). `serie` opcional (ex.: "SÉRIE #2") aparece como etiqueta na capa; publicar séries na ordem.
- `fala` é o texto da narração (números por extenso). `leg` é a legenda karaokê: mesmas palavras, com números em algarismos.
- `tela` resume a fala, não copia. `[trecho]` vira destaque.
- Toda coisa mencionada ganha visual, trocando na palavra em que é dita (`em` = índice da palavra em `leg`, a partir de 0; gerar por script, nunca à mão; em ordem crescente na cena):
  - `img`: imagem em domínio público ou licença livre, inteira, com crédito embaixo (`src` = arquivo em `img/<ID>/`).
  - `mapa`: `regiao` (europa, brasil, eua, mundo, russia), `pais` (código ISO numérico) ou `pino` {lon, lat, nome}; `rotulo` opcional.
  - `cal`: folhas/rótulos curtos (`folhas` [{txt, sub, em}], `dif` {txt, em}; `sep` troca a seta: "OU", "E", "≠"…). No máximo 2 folhas lado a lado.
  - `selo`: só no fechamento (imagem de `canal.json` → `selo`, ou o handle em texto se `selo` for null).

## Produção
1. Roteiro em `roteiros/<ID>.json` (modelo: `roteiros/EXEMPLO-001.json`).
2. Imagens em `img/<ID>/` + `img/<ID>/creditos.json` (`{"arquivo.jpg": "Autor, ano — Fonte"}`).
3. `cd rmt && npm i` (uma vez por ambiente; precisa de Chrome/Chromium para o Remotion).
4. `python3 -I tools/produzir.py <ID> --still` para conferir a capa e um quadro por cena; depois `python3 -I tools/produzir.py <ID>` para o MP4 em `out/<ID>/<ID>.mp4`.
- Narração: Gemini TTS (Google AI Studio), chave em `GEMINI_API_KEY`, passada só no comando. Cota grátis ~10 pedidos/dia por chave e modelo → **um pedido por vídeo** (o script não regera se `out/<ID>/narracao.wav` existir); espaçar ~30 s entre vídeos.
- Sem música: a música entra no app, da biblioteca comercial.
- Commit dos roteiros, imagens e créditos; não dos vídeos.
