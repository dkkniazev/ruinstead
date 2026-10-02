/**
 * Compact two-tone RPG icon set.  The filled silhouette gives small 18–30 px
 * icons a readable shape; the second path carries the material/detail lines.
 */
type IconDefinition = {
  body: string;
  detail?: string;
  fill?: number;
  stroke?: number;
};

const icons: Record<string, IconDefinition> = {
  menu:{body:'M4 5h16M4 12h16M4 19h16',fill:0},
  hero:{body:'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM4 21c.7-5 3.5-8 8-8s7.3 3 8 8Z',detail:'M8.5 16.5 12 19l3.5-2.5',fill:.18},
  bag:{body:'M5 8h14l1.5 13h-17L5 8Z',detail:'M8 8V6a4 4 0 0 1 8 0v2M8 13h8v4H8Z',fill:.22},
  book:{body:'M3.5 4.5C7 3.3 9.7 4 12 6v15c-2.4-2-5.2-2.7-8.5-1.5v-15Zm17 0C17 3.3 14.3 4 12 6v15c2.4-2 5.2-2.7 8.5-1.5v-15Z',detail:'M12 6v15M6.5 8.5h2.5m-2.5 4h2.5m6-4h2.5m-2.5 4h2.5',fill:.18},
  map:{body:'M3 5l6-2 6 3 6-2v15l-6 2-6-3-6 2V5Z',detail:'M9 3v15m6-12v15M5.5 9.5l2-1.2m9 6.3 2-1.2',fill:.14},
  home:{body:'M3 11 12 3l9 8-2 2-7-6-7 6-2-2Zm3 0v10h12V11',detail:'M10 21v-6h4v6M8 12h3',fill:.18},
  forge:{body:'M3 5h18v4l-5 4H8L3 9V5Zm7 8v4l-5 4h14l-5-4v-4Z',detail:'M6 7h12M8 18h8',fill:.24},
  shop:{body:'M4 8 5 4h14l1 4H4Zm1 5h14v8H5v-8Z',detail:'M4 8v2a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0V8M9 16h6',fill:.18},
  chest:{body:'M3.5 8h17v13h-17V8Zm2-3h13v3h-13V5Z',detail:'M3.5 12h17M9 12v4h6v-4M7 5v16m10-16v16',fill:.25},
  skin:{body:'M8 3.5 12 6l4-2.5 5 4.5-3 4v9H6v-9L3 8l5-4.5Z',detail:'M8 3.5 12 9l4-5.5M9 13h6',fill:.17},
  quest:{body:'M6 3h12v18H6V3Z',detail:'M9 3V2h6v1m-6 6 1.5 1.5L15 7m-6 7h6m-6 4h5',fill:.13},
  settings:{body:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',detail:'M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2.2 2.2m9.6 9.6L19 19m0-14-2.2 2.2M7.2 16.8 5 19',fill:.2},
  health:{body:'M12 21S3.5 16 3.5 9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8.5 2.5C20.5 16 12 21 12 21Z',fill:.3},
  xp:{body:'M12 2l3 6 6.5 1-4.8 4.7 1.2 7-5.9-3.2L6.1 21l1.2-7L2.5 9 9 8 12 2Z',fill:.55},
  damage:{body:'M17 2.5 21.5 3l-.8 4.8L10.8 17.7 6.3 13.2 16.2 3.3Z',detail:'M4 12l8 8M3 15l4 4m2-3 3 3',fill:.38},
  sword:{body:'M17 2.5 21.5 3l-.8 4.8L10.8 17.7 6.3 13.2 16.2 3.3Z',detail:'M4 12l8 8M3 15l4 4m2-3 3 3',fill:.42},
  axe:{body:'M12.5 2.5c3.5-.2 6.6.8 9.5 3l-1.8 6.1c-3.7-.1-6.4-1.2-8.2-3.2L9.8 12 6 9.8l2.4-4.1 4.1-3.2Z',detail:'M10.5 9.8 4.8 21.5 2.3 20l6-11.5M14 4.8c2.3.3 4 .9 5.4 1.9',fill:.46},
  hammer:{body:'M4 3h10.5L21 8.2 16.6 13l-5.2-4.2-2.2 3.4-4.1-2.6L7.3 6 4 3Z',detail:'M10.7 10.3 4.7 21.5 2.2 20l6.3-11.2M6.8 5.4h7.4',fill:.45},
  spear:{body:'M17.5 2.2 22 2l-.4 4.5-4.8 3.7-2.8-2.8 3.5-5.2Z',detail:'M15.5 8.7 5 22l-3-3L14 7M6.2 17.8 9 20.5',fill:.45},
  daggers:{body:'M7 3 11 2l-.8 4-5 8.6-2.8-1.7 3.8-9.4L7 3Zm10 0 4 .5 1 9.8-3 1-3.6-9 1.6-2.3Z',detail:'M4.3 13.8 10 20l-2 2-5.6-6.6m17.2-1.2L14 20l2 2 5.8-6.3M7.8 8l2.4 1.4m3.8 0 2.4-1.4',fill:.43},
  speed:{body:'M13 2 4 14h7l-1 8L20 9h-7V2Z',detail:'M3 6h5m-6 4h5m-4 8h4',fill:.35},
  dash:{body:'M5 12c2.5-4.6 6.4-7.6 12-8l-2.4 4H21l-8 9 1.7-4.2C11 13 8 14.4 5 17l-2-2c.7-1 1.4-2 2-3Z',detail:'M2 8h6M1 12h5m-3 8h6',fill:.4},
  wood:{body:'M5 7h12l4 5-4 5H5l-3-5 3-5Z',detail:'M5 7c3 2 3 8 0 10m12-10c-3 2-3 8 0 10M9 12h6',fill:.28},
  stone:{body:'M3 17 7 6l9-3 5 7-2 8-7 3-7-2-2-2Z',detail:'M7 6l5 8 7 4m-7-4-7 5',fill:.28},
  metal:{body:'M4 17 7 8h10l3 9-4 4H8l-4-4Z',detail:'M7 8l4 7h9m-9 0-3 6M9.5 10h5',fill:.3},
  crystal:{body:'M12 2l7 6-2 10-5 4-5-4L5 8l7-6Z',detail:'M12 2v20M5 8h14M7 18l5-10 5 10',fill:.26},
  gems:{body:'M12 2l7 6-2 10-5 4-5-4L5 8l7-6Z',detail:'M12 2v20M5 8h14M7 18l5-10 5 10',fill:.36},
  fiber:{body:'M5 21c1-8 5-13 13-17-1 7-5 12-13 17Z',detail:'M9 15c-3 0-5-2-5-5 4-1 7 0 8 3m1-3c0-4 2-7 6-8 2 4 1 7-3 10',fill:.22},
  coins:{body:'M5 7c0-2.2 3.1-4 7-4s7 1.8 7 4-3.1 4-7 4-7-1.8-7-4Z',detail:'M5 7v5c0 2.2 3.1 4 7 4s7-1.8 7-4V7m-14 5v5c0 2.2 3.1 4 7 4s7-1.8 7-4v-5',fill:.3},
  shield:{body:'M12 2l8 4v6c0 5-3 8-8 10-5-2-8-5-8-10V6l8-4Z',detail:'M12 6v11m-4-5h8',fill:.24},
  boss:{body:'M6 8 4 4l5 3 3-5 3 5 5-3-2 6v6c0 4-12 4-12 0V8Z',detail:'M8.5 13h.1m6.8 0h.1M9 17h6',fill:.34},
  elite:{body:'M4 6l5 4 3-7 3 7 5-4-2 12H6L4 6Z',detail:'M6 21h12',fill:.4},
  timer:{body:'M12 7a7 7 0 1 0 0 14 7 7 0 1 0 0-14Z',detail:'M9 2h6m-3 3v2m0 3v5l3 2',fill:.13},
  reward:{body:'M4 10h16v11H4V10ZM3 6h18v4H3V6Z',detail:'M12 6v15m0-15c-4 0-5-5-2-5 2 0 2 3 2 5Zm0 0c4 0 5-5 2-5-2 0-2 3-2 5Z',fill:.25},
  ad:{body:'M3 5h18v14H3V5Z',detail:'M10 8l6 4-6 4V8Z',fill:.14},
  revive:{body:'M12 5a8 8 0 1 1-7 4',detail:'M3 4v6h6m3 1v6m-3-3h6',fill:.12},
  ticket:{body:'M3 8 19 4l2 6-2 2 1 3-16 5-2-6 2-2-1-4Z',detail:'M14 6l3 11',fill:.24},
  upgrade:{body:'M12 3 5 11h4v10h6V11h4l-7-8Z',fill:.27},
  fusion:{body:'M8 7a4 4 0 1 0 0 8h3m5-8a4 4 0 1 1 0 8h-3',detail:'M9 11h6m-3-3v6',fill:.12},
  lock:{body:'M6 10h12v11H6V10Z',detail:'M9 10V7a3 3 0 0 1 6 0v3m-3 4v3',fill:.22},
  star:{body:'M12 2l3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1Z',fill:.92,stroke:1.25},
  close:{body:'',detail:'M5 5l14 14M19 5 5 19',fill:0},
  check:{body:'',detail:'M4 12l5 5L20 6',fill:0},
  arrow:{body:'',detail:'M4 12h16m-6-6 6 6-6 6',fill:0},
  potion:{body:'M8 3h8v4l4 7v7H4v-7l4-7V3Z',detail:'M8 3h8M7 15h10',fill:.22},
  cloud:{body:'M7 19a5 5 0 0 1-1-10 7 7 0 0 1 13-1 5 5 0 0 1-1 11H7Z',detail:'M12 11v7m-3-4 3-3 3 3',fill:.17},
};

const fallback=icons.quest;

export function icon(name: string, className=''): string {
  const def=icons[name]??fallback;
  const fill=def.fill??.18;
  const stroke=def.stroke??1.6;
  const body=def.body
    ? `<path class="r-icon-body" d="${def.body}" fill="currentColor" fill-opacity="${fill}" stroke="currentColor" stroke-width="${stroke}"/>`
    : '';
  const detail=def.detail
    ? `<path class="r-icon-detail" d="${def.detail}" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/>`
    : '';
  return `<svg class="r-icon ${className}" viewBox="0 0 24 24" aria-hidden="true">${body}${detail}</svg>`;
}

export const iconPath = (name: string): string => {
  const def=icons[name]??fallback;
  return [def.body,def.detail].filter(Boolean).join(' ');
};
