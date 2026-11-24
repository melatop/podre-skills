"""Produz um vídeo a partir de roteiros/<ID>.json.

Uso: python3 -I tools/produzir.py EXEMPLO-001 [--so-dados] [--still]

1. Narração: UMA chamada ao Gemini TTS por vídeo (cota grátis: 10/dia por modelo).
   O áudio fica em out/<ID>/narracao.wav e não é gerado de novo se já existir.
2. Corte por cena nas N-1 pausas mais longas, sem silêncio nas pontas, velocidade normal.
3. Monta rmt/src/data/<ID>.json e renderiza out/<ID>/<ID>.mp4 (1080x1920, 30 fps).
"""
import base64, json, math, os, re, shutil, subprocess, sys, urllib.request

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CANAL = json.load(open(os.path.join(RAIZ, "canal.json")))
MODELO = CANAL.get("modelo_tts", "gemini-3.1-flash-tts-preview")
VOZ = CANAL.get("voz", "Puck")
ESTILO = CANAL["estilo_narracao"]
ESTILO_SERIO = CANAL.get("estilo_narracao_serio", ESTILO)
CHROME = shutil.which("google-chrome") or shutil.which("chromium")


def sh(*a, **k):
    return subprocess.run(a, check=True, capture_output=True, text=True, **k)


def tts(texto, destino, estilo):
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        sys.exit("GEMINI_API_KEY não está definida no ambiente.")
    corpo = {"contents": [{"parts": [{"text": estilo + "\n\n" + texto}]}],
             "generationConfig": {"responseModalities": ["AUDIO"],
                                  "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOZ}}}}}
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{MODELO}:generateContent",
        data=json.dumps(corpo).encode(), headers={"Content-Type": "application/json", "x-goog-api-key": key})
    with urllib.request.urlopen(req, timeout=300) as r:
        resp = json.load(r)
    pcm = base64.b64decode(resp["candidates"][0]["content"]["parts"][0]["inlineData"]["data"])
    raw = destino + ".pcm"
    open(raw, "wb").write(pcm)
    sh("ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", raw, destino)
    os.remove(raw)


def duracao(f):
    return float(sh("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f).stdout)


def cortar(narr, falas, pasta, vid):
    """Corta nas pausas: escolhe, em ordem, as N-1 pausas que melhor batem com a posição
    esperada de cada fronteira (proporcional ao número de caracteres falados), preferindo pausas longas."""
    n = len(falas)
    log = subprocess.run(["ffmpeg", "-hide_banner", "-i", narr, "-af", "silencedetect=n=-40dB:d=0.25", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    ini = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)]
    fim = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
    pausas = [((s + e) / 2, e - s) for s, e in zip(ini, fim) if s > 0.3]
    if len(pausas) < n - 1:
        sys.exit(f"Achei {len(pausas)} pausas e preciso de {n - 1}. Gere a narração de novo.")
    total = duracao(narr)
    # tempo de fala estimado = total menos as pausas longas; fronteiras esperadas por caracteres
    pesos = [len(f) for f in falas]
    acc, esperado = 0, []
    for p in pesos[:-1]:
        acc += p
        esperado.append(total * acc / sum(pesos))
    # programação dinâmica: casar fronteiras k com pausas j em ordem crescente
    INF = float("inf")
    m = len(pausas)
    custo = lambda k, j: abs(pausas[j][0] - esperado[k]) - 3.0 * pausas[j][1]
    D = [[INF] * m for _ in range(n - 1)]
    P = [[-1] * m for _ in range(n - 1)]
    for j in range(m):
        D[0][j] = custo(0, j)
    for k in range(1, n - 1):
        melhor, arg = INF, -1
        for j in range(m):
            if j > 0 and D[k - 1][j - 1] < melhor:
                melhor, arg = D[k - 1][j - 1], j - 1
            if arg >= 0:
                D[k][j] = melhor + custo(k, j)
                P[k][j] = arg
    j = min(range(m), key=lambda x: D[n - 2][x])
    escolha = []
    for k in range(n - 2, -1, -1):
        escolha.append(j)
        j = P[k][j]
    cortes = [pausas[x][0] for x in reversed(escolha)]
    lim = [0.0] + cortes + [total]
    durs = []
    for i in range(n):
        out = os.path.join(pasta, f"{vid}_{i}.wav")
        # tira o silêncio das pontas e encurta pausas internas longas
        sh("ffmpeg", "-y", "-loglevel", "error", "-ss", f"{lim[i]:.3f}", "-to", f"{lim[i + 1]:.3f}", "-i", narr, "-af",
           "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
           "silenceremove=stop_periods=-1:stop_duration=0.45:stop_threshold=-45dB:stop_silence=0.3,atempo=1.08",
           "-ar", "48000", out)
        durs.append(duracao(out))
    return durs


def main():
    vid = sys.argv[1]
    R = json.load(open(os.path.join(RAIZ, "roteiros", f"{vid}.json")))
    cenas = R["cenas"]
    out = os.path.join(RAIZ, "out", vid); os.makedirs(out, exist_ok=True)
    pub = os.path.join(RAIZ, "rmt", "public")
    narr = os.path.join(out, "narracao.wav")
    if not os.path.exists(narr):
        estilo = ESTILO_SERIO if R.get("sensivel") else ESTILO
        tts("\n\n".join(c["fala"] for c in cenas), narr, estilo)
        print("narração gerada", round(duracao(narr), 1), "s")
    os.makedirs(os.path.join(pub, "audio"), exist_ok=True)
    durs = cortar(narr, [c["fala"] for c in cenas], os.path.join(pub, "audio"), vid)

    # imagens e créditos: img/<ID>/ (arquivos + creditos.json {"arquivo": "crédito"})
    pasta_img = os.path.join(RAIZ, "img", vid)
    cred = {}
    if os.path.exists(os.path.join(pasta_img, "creditos.json")):
        cred = json.load(open(os.path.join(pasta_img, "creditos.json")))
    dst_img = os.path.join(pub, "img", vid); os.makedirs(dst_img, exist_ok=True)
    falta = []
    for c in cenas:
        for v in c.get("visual", []):
            if v["tipo"] == "img":
                src = os.path.join(pasta_img, v["src"])
                if not os.path.exists(src):
                    falta.append(v["src"]); continue
                shutil.copy(src, os.path.join(dst_img, v["src"]))
                v["arq"] = f"img/{vid}/{v['src']}"
                v["credito"] = cred.get(v["src"], "Wikimedia Commons")
    if falta:
        sys.exit("Faltam imagens em img/%s/: %s" % (vid, ", ".join(sorted(set(falta)))))
    if CANAL.get("selo") and not os.path.exists(os.path.join(pub, CANAL["selo"])):
        sys.exit("Falta rmt/public/%s (selo do fechamento definido em canal.json)." % CANAL["selo"])

    for c, d, i in zip(cenas, durs, range(len(cenas))):
        c["audio"] = f"audio/{vid}_{i}.wav"; c["dur"] = d; c["frames"] = math.ceil((d + 0.45) * 30)
    # o selo do fechamento segura 1,5 s depois da fala (margem para ficar acima de 1 minuto)
    cenas[-1]["frames"] += 45
    os.makedirs(os.path.join(RAIZ, "rmt", "src", "data"), exist_ok=True)
    json.dump({"id": vid, "cenas": cenas, "capa": R.get("capa"), "capa_cor": R.get("capa_cor"), "serie": R.get("serie"), "canal": CANAL}, open(os.path.join(RAIZ, "rmt", "src", "data", "atual.json"), "w"),
              ensure_ascii=False)
    total = sum(c["frames"] for c in cenas) / 30
    print(vid, "duração", round(total, 1), "s")
    if "--so-dados" in sys.argv:
        return
    rmt = os.path.join(RAIZ, "rmt")
    base = ["npx", "remotion"]
    br = [f"--browser-executable={CHROME}"] if CHROME else []
    if "--still" in sys.argv:
        sh(*base, "still", "src/index.ts", "Video", os.path.join(out, "still_capa.png"), "--frame=0",
           "--scale=0.35", "--log=error", *br, cwd=rmt)
        f = 0
        for i, c in enumerate(cenas):
            fr = f + min(int(c["frames"] * 0.7), c["frames"] - 3)
            sh(*base, "still", "src/index.ts", "Video", os.path.join(out, f"still_{i}.png"), f"--frame={fr}",
               "--scale=0.35", "--log=error", *br, cwd=rmt)
            f += c["frames"]
        return
    mp4 = os.path.join(out, f"{vid}.mp4")
    sh(*base, "render", "src/index.ts", "Video", mp4, "--codec=h264", "--crf=20", "--x264-preset=veryfast",
       "--log=error", *br, cwd=rmt)
    print("ok", mp4, round(duracao(mp4), 1), "s")


if __name__ == "__main__":
    main()
