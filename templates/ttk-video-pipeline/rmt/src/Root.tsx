import React from 'react';
import { Composition } from 'remotion';
import { Video } from './Video';
import data from './data/atual.json';

export const Root: React.FC = () => (
  <Composition
    id="Video"
    component={Video as any}
    durationInFrames={(data as any).cenas.reduce((a: number, c: any) => a + c.frames, 0)}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{ cenas: (data as any).cenas, capa: (data as any).capa, capa_cor: (data as any).capa_cor, serie: (data as any).serie, canal: (data as any).canal }}
  />
);
