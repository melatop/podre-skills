---
name: "ttk-stats"
description: "Analisa as métricas de um canal de TikTok no TikTok Studio, define a estratégia dos próximos ~10 vídeos, produz os vídeos e agenda 2 por dia. Use com /ttk-stats."
---

# /ttk-stats

Ciclo completo de um canal de TikTok com vídeos 100% gerados por IA: análise das métricas → estratégia → 10 vídeos → agendamento (2 por dia). Responda em português do Brasil, sem elogios nem floreio. Pergunte antes de ações irreversíveis (excluir, publicar fora do combinado, mudar configuração da conta).

Crie uma lista de tarefas com as etapas abaixo e marque cada uma ao concluir.

## 0. Preparação
1. Peça ao usuário, numa mensagem curta:
   - deixar o TikTok aberto no Chrome **logado na conta que quer analisar** (a versão web não tem "Trocar conta"; trocar exige sair e entrar com senha, o que só o usuário pode fazer);
   - qual canal é (o @) e, se não estiver claro, qual repositório de produção e qual planilha de pautas ele usa.
2. Carregue a skill do Claude in Chrome e confira a conta logada antes de qualquer coisa: em uma aba do tiktok.com, `fetch('/passport/web/account/info/')` → `data.username`. Se não for a conta pedida, pare e peça para trocar.
3. Clone o repositório do canal e leia o CLAUDE.md (pipeline, formato do roteiro, regras de conteúdo, IDs, chave da API) e os documentos de marca/decisões do projeto, se houver.

## 1. Análise das métricas (Claude in Chrome)
- `tiktok.com/tiktokstudio/analytics`: visão geral, espectadores e seguidores (últimos 7 ou 28 dias).
- `tiktokstudio/content`: liste todos os vídeos e pegue os IDs nos links `/video/<id>`. A lista carrega aos poucos: role até o fim, ou use a busca do Studio.
- Para cada vídeo, `tiktokstudio/analytics/<id>`: visualizações, curtidas, comentários, compartilhamentos, salvamentos, tempo médio, % que viu até o fim, novos seguidores, "parou de assistir em", origem do tráfego, termos pesquisados. Em `/<id>/viewers`: idade, gênero, local. Em `/<id>/engagement`: palavras dos comentários. Em `tiktokstudio/comment`: os comentários.
- Extraia com JavaScript (`document.body.innerText`) devolvendo pouco texto por chamada (a ferramenta corta saídas acima de ~1.500 caracteres). Use `browser_batch` para encadear ações.
- Monte uma tabela por vídeo (tempo médio também como % da duração) e responda:
  - quais ganchos seguram mais e quais derrubam no primeiro segundo;
  - qual duração retém melhor;
  - o que gera comentário (debate) e salvamento (conteúdo útil);
  - de onde vêm os seguidores;
  - quem é o público real e o que as pessoas buscam;
  - se há tema saturado.
- Confira no código de render o que aparece no frame 0: tela vazia ou com fade derruba a retenção no primeiro segundo.
- Salve a análise num documento do projeto e mostre ao usuário um resumo curto com a tabela.

## 2. Estratégia dos próximos ~10 vídeos
- Transforme os achados em regras de formato (ex.: capa no frame 0 com a narração já rodando; gancho de até ~8 palavras com "você" ou contradição; sem data no começo; duração 61–70 s; um ponto de debate e pergunta de opinião no fechamento; série numerada; termo buscado na primeira linha da legenda; não repetir assunto em dias seguidos).
- Leia a planilha de pautas. Use códigos novos no fim da numeração e confira se o código já existe (não sobrescrever pautas de outros dias). Descarte pautas que repetem vídeos feitos, reescreva ganchos fracos, crie pautas a partir de termos buscados e comentários.
- Proponha os 10 temas (com data e horário) numa mensagem curta e espere o OK. Se houver série numerada, garanta que a ordem de publicação siga a numeração.

## 3. Chave da API (Google AI Studio)
- Procure a chave nesta ordem: variável de ambiente `GEMINI_API_KEY`; chave indicada no CLAUDE.md do repositório. Só se não houver nenhuma, peça ao usuário uma API key do Google AI Studio.
- Passe a chave só no comando (`GEMINI_API_KEY=... python3 ...`). Não a copie para outros arquivos, planilha ou memória.
- Cota grátis do TTS: ~10 pedidos por dia por chave e modelo, renovada às 5h (Brasília); também há limite por minuto (erro 429). Uma chamada por vídeo, espaçadas ~30 s. Se a cota acabar, agende a retomada para depois da renovação com uma tarefa agendada nesta conversa e avise o usuário. Canais que usam a mesma chave dividem a cota.

## 4. Produção dos 10 vídeos
- Siga o pipeline do CLAUDE.md do repositório (roteiro → imagens → narração → stills → render).
- Cheque os fatos na web antes de fechar cada roteiro e liste em "confirmar" o que o usuário deve checar. Temas atuais: os dois lados.
- Gere os índices de palavra dos visuais por script (procurando a palavra na legenda), nunca à mão; mantenha os visuais de cada cena em ordem crescente; não ponha três quadros lado a lado em 1080 px.
- Mire ~215–225 palavras de fala: o corte de silêncios encurta e o vídeo precisa passar de 1 minuto. Confira a duração real; segure o quadro final ~1,5 s como margem.
- Imagens: se o ambiente não baixa do Wikimedia, use o Chrome — consulte a API do Commons (`api.php?action=query&prop=imageinfo&iiprop=url|extmetadata&iiurlheight=1000`) para link, licença e autor, mostre a miniatura na página, afaste o cursor e capture com a ação `zoom` (save_to_disk). Só domínio público ou licença livre, com crédito.
- Monte uma folha de contato (capa + um quadro por cena) e confira antes de renderizar.
- Commit numa branch própria; ao juntar com a main, verifique se outra sessão mexeu nos mesmos arquivos e mantenha as decisões aprovadas. Não commite vídeos.
- Envie os MP4 ao usuário conforme ficarem prontos.

## 5. Agendamento no TikTok Studio (2 por dia)
- Horários padrão sem dados de público (abaixo de 100 seguidores não há horários): 12h30 e 19h30, intercalando os tipos de conteúdo.
- Confira de novo a conta logada antes de subir.
- O envio de arquivo pelo Chrome aceita até 3,8 MB: comprima uma cópia (`ffmpeg -c:v libx264 -preset veryfast -crf 25–31 -tune animation -c:a aac -b:a 96k -movflags +faststart`, mantendo 1080p) e confira um quadro.
- Em `tiktokstudio/upload`: ache o `input[type=file]` com `find` e use `file_upload` (não clique no botão).
- Descrição: foque `[contenteditable=true]`, selecione tudo, apague e digite a legenda com as hashtags no fim; Esc para fechar as sugestões.
- "Exibir mais" → ative "Conteúdo gerado por IA" (confirme "Ativar").
- Se aparecer o aviso de "verificações automáticas", cancele (muda a configuração da conta; pergunte ao usuário).
- Rádio "Programar" → "Permitir" → data no calendário (`span.day.valid`, clique via JS funciona) → hora com **clique real**: abra o seletor, pegue as coordenadas de `.tiktok-timepicker-option-text` (hora à esquerda, minuto à direita) com `getBoundingClientRect` e clique com o mouse; clique via JS não registra. Confira os valores dos inputs antes de "Agendar".
- Depois de cada agendamento, confirme pela **busca** da aba Publicações (a lista não mostra tudo e induz a subir em dobro).
- Publicação agendada não pode ser editada: para mudar a data, suba de novo e exclua a antiga, com autorização do usuário.
- Agendando pelo Studio o vídeo sai sem música da biblioteca comercial (só pelo app). Avise o usuário.

## 6. Fechamento
- Registre cada vídeo na planilha (status, data e hora agendadas).
- Envie ao usuário: calendário final em tabela, itens de "confirmar" por vídeo, horários vazios e pendências.
- Feche as abas que você abriu no Chrome.