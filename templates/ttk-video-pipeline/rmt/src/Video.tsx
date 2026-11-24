import React, { useEffect, useState } from 'react';
import {
  AbsoluteFill, Audio, Img, Sequence, continueRender, delayRender, spring, staticFile,
  useCurrentFrame, useVideoConfig, interpolate,
} from 'remotion';
import '@fontsource/anton';
import '@fontsource/archivo-black';
import '@fontsource/archivo/400.css';
import '@fontsource/archivo/700.css';
import { geoMercator, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import world from 'world-atlas/countries-110m.json';

// Identidade do canal: vem de canal.json (via produzir.py). Valores abaixo são o padrão.
let FUNDO = '#1D3557', ESCURO = '#121212', CLARO = '#FFFFFF', PAPEL = '#F3EADB', DESTAQUE = '#FFC21A';
let HANDLE = '@seucanal', CTA = 'SEGUE O @seucanal', SELO: string | null = null;
const aplicaCanal = (c: any) => {
  if (!c) return;
  const k = c.cores || {};
  FUNDO = k.fundo || FUNDO; ESCURO = k.escuro || ESCURO; CLARO = k.claro || CLARO; PAPEL = k.papel || PAPEL; DESTAQUE = k.destaque || DESTAQUE;
  HANDLE = c.handle || HANDLE; CTA = c.cta || `SEGUE O ${HANDLE}`; SELO = c.selo || null;
};
const PAISES = (feature(world as any, (world as any).objects.countries) as any).features;
const REGIOES: Record<string, [[number, number], [number, number]]> = {
  europa: [[-12, 34], [62, 71]],
  brasil: [[-75, -34], [-34, 6]],
  eua: [[-125, 24], [-66, 50]],
  mundo: [[-170, -58], [180, 80]],
  russia: [[20, 42], [95, 70]],
};

// Tempo de cada palavra da legenda, proporcional ao tamanho, ao longo do áudio da cena
const tempos = (leg: string, dur: number) => {
  const ws = leg.split(/\s+/).filter(Boolean);
  const pesos = ws.map((w) => w.length + 2);
  const tot = pesos.reduce((a, b) => a + b, 0);
  let acc = 0;
  return ws.map((w, i) => {
    const ini = (acc / tot) * dur * 30;
    acc += pesos[i];
    return { w, ini };
  });
};

// Texto com [destaque] em caixa amarela
const Marcado: React.FC<{ txt: string; style: React.CSSProperties }> = ({ txt, style }) => (
  <div style={style}>
    {txt.split(/(\[[^\]]+\])/).map((p, i) =>
      p.startsWith('[') ? (
        <span key={i} style={{ background: DESTAQUE, color: ESCURO, padding: '0 14px', boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}>
          {p.slice(1, -1)}
        </span>
      ) : (
        <span key={i}>{p}</span>
      ),
    )}
  </div>
);

const entra = (f: number, fps: number) => spring({ frame: f, fps, config: { damping: 14, stiffness: 160 } });

const Imagem: React.FC<{ v: any; f: number }> = ({ v, f }) => {
  const { fps } = useVideoConfig();
  const s = entra(f, fps);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${0.9 + 0.1 * s})`, opacity: s }}>
      <Img src={staticFile(v.arq)} style={{ maxWidth: 900, maxHeight: 790, border: `14px solid ${CLARO}`, boxShadow: '0 18px 40px rgba(0,0,0,.35)' }} />
      <div style={{ marginTop: 18, fontFamily: 'Archivo', fontSize: 26, color: CLARO, maxWidth: 900, textAlign: 'center' }}>{v.credito}</div>
    </div>
  );
};

const Mapa: React.FC<{ v: any; f: number }> = ({ v, f }) => {
  const { fps } = useVideoConfig();
  const W = 940, H = 860;
  const [[a, b], [c, d]] = REGIOES[v.regiao || 'europa'];
  const proj = geoMercator().fitExtent([[10, 10], [W - 10, H - 10]], { type: 'MultiPoint', coordinates: [[a, b], [c, d]] } as any);
  const path = geoPath(proj);
  const s = entra(f, fps);
  const pino = v.pino ? proj([v.pino.lon, v.pino.lat]) : null;
  const queda = v.pino ? entra(f - 8, fps) : 0;
  return (
    <div style={{ position: 'relative', opacity: Math.min(1, s * 1.5) }}>
      <svg width={W} height={H} style={{ border: `14px solid ${CLARO}`, background: '#9FC7D9', display: 'block' }}>
        {PAISES.map((p: any, i: number) => (
          <path key={i} d={path(p) || ''} fill={v.pais && Number(p.id) === v.pais ? DESTAQUE : PAPEL} stroke={ESCURO} strokeWidth={1.4} />
        ))}
        {pino && (
          <g transform={`translate(${pino[0]},${pino[1] - (1 - queda) * 260})`} opacity={queda}>
            <path d="M0,0 C-26,-38 -34,-52 -34,-70 A34,34 0 1 1 34,-70 C34,-52 26,-38 0,0Z" fill={FUNDO} stroke={ESCURO} strokeWidth={5} />
            <circle cx={0} cy={-70} r={12} fill={CLARO} />
          </g>
        )}
      </svg>
      {(v.rotulo || v.pino) && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: -30, display: 'flex', justifyContent: 'center' }}>
          <div style={{ background: ESCURO, color: CLARO, fontFamily: 'Archivo Black', fontSize: 46, padding: '8px 26px', textTransform: 'uppercase' }}>
            {v.rotulo || v.pino.nome}
          </div>
        </div>
      )}
    </div>
  );
};

const Calendario: React.FC<{ v: any; f: number; quadro: (em: number) => number }> = ({ v, f, quadro }) => {
  const { fps } = useVideoConfig();
  const base = quadro(v.em);
  const folhas = v.folhas || [];
  const larg = folhas.length > 1 ? 400 : 520;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
        {folhas.map((fo: any, i: number) => {
          if (f + base < quadro(fo.em)) return null;
          const s = entra(f + base - quadro(fo.em), fps);
          return (
            <React.Fragment key={i}>
              {i > 0 && <div style={{ fontFamily: 'Anton', fontSize: v.sep ? 70 : 110, color: CLARO, opacity: s }}>{v.sep || '→'}</div>}
              <div style={{ width: larg, background: PAPEL, border: `12px solid ${CLARO}`, boxShadow: '0 18px 40px rgba(0,0,0,.3)', transform: `scale(${s})` }}>
                <div style={{ background: ESCURO, height: 70, color: CLARO, fontFamily: 'Archivo Black', fontSize: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', textTransform: 'uppercase' }}>
                  {fo.sub || ''}
                </div>
                <div style={{ fontFamily: 'Anton', fontSize: Math.min(120, Math.floor((larg - 40) / (Math.max(...(fo.txt.length > 9 ? fo.txt.split(' ') : [fo.txt]).map((l: string) => l.length)) * 0.52))), color: ESCURO, textAlign: 'center', padding: '40px 10px', lineHeight: 1.05, whiteSpace: 'pre-line' }}>{fo.txt.length > 9 ? fo.txt.split(' ').join('\n') : fo.txt}</div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
      {v.dif && (
        <div style={{ background: DESTAQUE, color: ESCURO, fontFamily: 'Archivo Black', fontSize: 64, padding: '10px 34px', opacity: entra(f + base - quadro(v.dif.em), fps) }}>
          {v.dif.txt}
        </div>
      )}
    </div>
  );
};

const Selo: React.FC<{ f: number }> = ({ f }) => {
  const { fps } = useVideoConfig();
  const s = entra(f, fps);
  if (SELO) return <Img src={staticFile(SELO)} style={{ width: 700, transform: `scale(${s}) rotate(${(1 - s) * -20}deg)` }} />;
  return (
    <div style={{ background: CLARO, color: ESCURO, fontFamily: 'Anton', fontSize: 110, padding: '20px 50px', transform: `scale(${s})` }}>{HANDLE}</div>
  );
};

const Cena: React.FC<{ c: any }> = ({ c }) => {
  const f = useCurrentFrame();
  const ws = tempos(c.leg, c.dur);
  const quadro = (em: number) => (ws[Math.min(em, ws.length - 1)] || { ini: 0 }).ini;
  // visual atual
  const vis = (c.visual || []).map((v: any, i: number) => ({ ...v, q: i === 0 ? 0 : quadro(v.em) }));
  let atual = vis[0];
  vis.forEach((v: any) => { if (f >= v.q) atual = v; });
  const fv = atual ? f - atual.q : 0;
  // legenda karaokê: grupos de até 4 palavras, quebrando no fim da frase
  const grupos: number[][] = [];
  let g: number[] = [];
  ws.forEach((w, i) => {
    g.push(i);
    if (g.length === 4 || /[.?!:]$/.test(w.w)) { grupos.push(g); g = []; }
  });
  if (g.length) grupos.push(g);
  let falando = 0;
  ws.forEach((w, i) => { if (f >= w.ini) falando = i; });
  const grupo = grupos.find((gr) => gr.includes(falando)) || [];
  const gancho = c.tipo === 'gancho' || c.tipo === 'fechamento';
  return (
    <AbsoluteFill style={{ background: FUNDO }}>
      <Audio src={staticFile(c.audio)} />
      <div style={{ position: 'absolute', top: 70, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <div style={{ background: ESCURO, color: CLARO, fontFamily: 'Archivo Black', fontSize: 34, padding: '6px 20px' }}>{HANDLE}</div>
      </div>
      <div style={{ position: 'absolute', top: 170, left: 60, right: 60, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Marcado
          txt={c.tela}
          style={{
            fontFamily: gancho ? 'Anton' : 'Archivo Black', fontSize: gancho ? 112 : 70, lineHeight: 1.12,
            color: CLARO, textAlign: 'center', textTransform: gancho ? 'uppercase' : 'none',
            opacity: c.tipo === 'gancho' ? 1 : interpolate(f, [0, 6], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        />
      </div>
      <div style={{ position: 'absolute', top: 500, left: 0, right: 0, height: 960, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {atual?.tipo === 'img' && <Imagem key={atual.q} v={atual} f={fv} />}
        {atual?.tipo === 'mapa' && <Mapa key={atual.q} v={atual} f={fv} />}
        {atual?.tipo === 'cal' && <Calendario key={atual.q} v={atual} f={fv} quadro={quadro} />}
        {atual?.tipo === 'selo' && <Selo f={fv} />}
      </div>
      <div style={{ position: 'absolute', top: 1560, left: 50, right: 50, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '6px 14px' }}>
        {grupo.map((i) => (
          <span key={i} style={{
            fontFamily: 'Archivo Black', fontSize: 62, padding: '2px 12px',
            color: i === falando ? ESCURO : CLARO, background: i === falando ? DESTAQUE : 'transparent',
            WebkitTextStroke: i === falando ? '0' : `3px ${ESCURO}`, paintOrder: 'stroke fill',
          }}>{ws[i].w}</span>
        ))}
      </div>
      {c.tipo === 'fechamento' && (
        <div style={{ position: 'absolute', top: 1720, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          <div style={{ background: CLARO, color: ESCURO, fontFamily: 'Archivo Black', fontSize: 44, padding: '8px 24px' }}>{CTA}</div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// Capa: primeiro frame do vídeo (miniatura), já com a narração rodando; some em 0,4 s. Cores: escura | fundo | clara
const CAPA_FRAMES = 12;
const CORES_CAPA: Record<string, [string, string, string]> = {
  escura: [ESCURO, CLARO, DESTAQUE], fundo: [FUNDO, CLARO, DESTAQUE], clara: [PAPEL, ESCURO, FUNDO],
};
const Capa: React.FC<{ txt: string; cor: string; serie?: string }> = ({ txt, cor, serie }) => {
  const [fundo, texto, destaque] = CORES_CAPA[cor] || CORES_CAPA.fundo;
  return (
    <AbsoluteFill style={{ background: fundo, alignItems: 'center', justifyContent: 'center', padding: 70 }}>
      {serie && <div style={{ position: 'absolute', top: 260, background: destaque, color: destaque === DESTAQUE ? ESCURO : CLARO, fontFamily: 'Archivo Black', fontSize: 52, padding: '8px 26px' }}>{serie}</div>}
      <div style={{ fontFamily: 'Anton', fontSize: 140, lineHeight: 1.25, color: texto, textAlign: 'center', textTransform: 'uppercase' }}>
        {txt.split(/(\[[^\]]+\])/).map((p, i) =>
          p.startsWith('[') ? (
            <span key={i} style={{ background: destaque, color: destaque === DESTAQUE ? ESCURO : CLARO, padding: '0 16px', boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}>{p.slice(1, -1)}</span>
          ) : <span key={i}>{p}</span>,
        )}
      </div>
      <div style={{ position: 'absolute', bottom: 220, background: texto, color: fundo, fontFamily: 'Archivo Black', fontSize: 48, padding: '8px 26px' }}>{HANDLE}</div>
    </AbsoluteFill>
  );
};

export const Video: React.FC<{ cenas: any[]; capa?: string; capa_cor?: string; serie?: string; canal?: any }> = ({ cenas, capa, capa_cor, serie, canal }) => {
  aplicaCanal(canal);
  const [h] = useState(() => delayRender('fontes'));
  useEffect(() => {
    Promise.all(['64px Anton', '64px "Archivo Black"', '26px Archivo'].map((x) => document.fonts.load(x)))
      .then(() => continueRender(h)).catch(() => continueRender(h));
  }, [h]);
  let ini = 0;
  return (
    <AbsoluteFill style={{ background: FUNDO }}>
      {cenas.map((c, i) => {
        const el = (
          <Sequence key={i} from={ini} durationInFrames={c.frames}>
            <Cena c={c} />
          </Sequence>
        );
        ini += c.frames;
        return el;
      })}
      {capa && (
        <Sequence from={0} durationInFrames={CAPA_FRAMES}>
          <Capa txt={capa} cor={capa_cor || 'fundo'} serie={serie} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
