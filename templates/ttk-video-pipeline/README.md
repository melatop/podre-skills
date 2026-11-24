# ttk-video-pipeline

Template de produção de vídeos verticais (1080×1920) para TikTok/Reels, 100% gerados por IA: roteiro em JSON → narração com Gemini TTS → montagem no Remotion. É o pipeline que a skill [`/ttk-stats`](../../skills/ttk-stats/SKILL.md) usa na etapa de produção.

## O que sai
- **Capa** no primeiro frame (miniatura), com a narração já rodando.
- **Cenas** com texto na tela, visual que troca na palavra falada (imagem com crédito, mapa com pino ou "folhas" de rótulo/data) e **legenda karaokê** de até 4 palavras.
- **Fechamento** com selo (ou o @ do canal) e chamada para seguir, segurando 1,5 s.

## Como começar
1. Copie esta pasta para um repositório novo do seu canal.
2. Edite `canal.json`: @, chamada final, cores, selo (opcional, em `rmt/public/`), voz e estilo da narração.
3. Preencha os campos entre [colchetes] no `CLAUDE.md`: é ele que diz ao Claude as regras do canal.
4. Instale: `cd rmt && npm i` (precisa de Node 18+, ffmpeg, Python 3 e Chrome/Chromium).
5. Teste com o exemplo: `GEMINI_API_KEY=sua_chave python3 -I tools/produzir.py EXEMPLO-001 --still` e depois sem `--still`.

## Estrutura
```
canal.json            identidade do canal (cores, @, selo, voz)
CLAUDE.md             regras de conteúdo e de produção para o Claude
roteiros/<ID>.json    um roteiro por vídeo
img/<ID>/             imagens + creditos.json
tools/produzir.py     narração, corte por cena, stills e render
rmt/                  projeto Remotion (Video.tsx, Root.tsx)
```

## Limites conhecidos
- Gemini TTS grátis: ~10 narrações por dia por chave.
- A narração é cortada por cena pelas pausas; se faltar pausa, o script pede para gerar de novo.
