/** Clean, readable Ruinstead UI glyphs on a shared 24-unit grid. */
const paths: Record<string,string> = {
  hero:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21c.8-4.5 3.4-7 8-7s7.2 2.5 8 7',
  bag:'M6 8h12l1.5 13h-15L6 8Zm3 0V6a3 3 0 0 1 6 0v2m-7 5h8',
  book:'M4 5c3.2-1 5.6-.4 8 1.5V21c-2.4-1.9-4.8-2.5-8-1.5V5Zm16 0c-3.2-1-5.6-.4-8 1.5V21c2.4-1.9 4.8-2.5 8-1.5V5',
  map:'M3 5l6-2 6 3 6-2v15l-6 2-6-3-6 2V5Zm6-2v15m6-12v15',
  home:'M3 11 12 3l9 8M5 9v12h14V9m-9 12v-6h4v6',
  forge:'M4 6h16v4l-4 3H8l-4-3V6Zm6 7v4l-5 3h14l-5-3v-4',
  shop:'M4 9l1-5h14l1 5m-16 0v2a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0V9M6 13v8h12v-8',
  chest:'M4 8h16v13H4V8Zm2 0V5h12v3M4 12h16m-10 0v4h4v-4',
  skin:'M8 4l4 2 4-2 5 4-3 4v9H6v-9L3 8l5-4Zm0 0 4 5 4-5',
  quest:'M7 3h10v18H7V3Zm3 0V2h4v1m-4 6 1.5 1.5L15 7m-5 7h4m-4 4h4',
  settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1',
  health:'M12 21S4 16 4 9a4 4 0 0 1 7-2l1 1 1-1a4 4 0 0 1 7 2c0 7-8 12-8 12Z',
  xp:'M12 2l3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1Z',
  damage:'M5 21l3-6L19 3l2 2-2 5L9 18l-4 3Zm1-7 4 4m-6-7 7 7',
  sword:'M5 21l3-6L19 3l2 2-2 5L9 18l-4 3Zm1-7 4 4m-6-7 7 7',
  axe:'M6 22 16 5m-5-1 5 1 5-2v5l-3 5-6-4-4-1 3-4Z',
  hammer:'M6 21 15 9m-4-5 4-2 7 6-4 5-7-6V4Z',
  spear:'M3 21 18 6m-4-1 7-3-3 7M6 18l-2-2',
  daggers:'M3 21 10 7l3-4 2 2-3 5-7 12m7-2 5-11 4-5 2 2-3 5-5 11M6 14l4 3m6-3 4 2',
  speed:'M13 2 4 14h7l-1 8L20 9h-7V2ZM3 6h5M2 10h5M3 18h4',
  wood:'M5 7h12l3 5-3 5H5l-3-5 3-5Zm0 0c3 2 3 8 0 10m12-10c-3 2-3 8 0 10m-8-5h5',
  stone:'M3 17 7 6l9-3 5 7-2 8-7 3-7-2-2-2Zm4-11 5 8 7 4m-7-4-7 5',
  metal:'M4 17 7 8h10l3 9-4 4H8l-4-4Zm3-9 4 7h9m-9 0-3 6',
  crystal:'M12 2l7 6-2 10-5 4-5-4L5 8l7-6Zm0 0v20M5 8h14m-12 10 5-10 5 10',
  gems:'M12 2l7 6-2 10-5 4-5-4L5 8l7-6Zm0 0v20M5 8h14m-12 10 5-10 5 10',
  fiber:'M5 21c1-8 5-13 13-17m-9 11c-3 0-5-2-5-5 4-1 7 0 8 3m1-3c0-4 2-7 6-8 2 4 1 7-3 10',
  coins:'M5 7c0-2 3-4 7-4s7 2 7 4-3 4-7 4-7-2-7-4Zm0 0v5c0 2 3 4 7 4s7-2 7-4V7m-14 5v5c0 2 3 4 7 4s7-2 7-4v-5',
  shield:'M12 2l8 4v6c0 5-3 8-8 10-5-2-8-5-8-10V6l8-4Zm0 5v10',
  boss:'M6 8 4 4l5 3 3-5 3 5 5-3-2 6m-11 1v5c0 4 10 4 10 0v-5m-7 3h.1m3.9 0h.1m-5.1 4h6',
  elite:'M4 6l5 4 3-7 3 7 5-4-2 12H6L4 6Zm2 15h12',
  timer:'M9 2h6m-3 3v2m0 0a7 7 0 1 0 0 14 7 7 0 1 0 0-14Zm0 3v5l3 2',
  reward:'M4 10h16v11H4V10Zm-1-4h18v4H3V6Zm9 0c-4 0-5-5-2-5 2 0 2 3 2 5Zm0 0c4 0 5-5 2-5-2 0-2 3-2 5Zm0 0v15',
  ad:'M3 5h18v14H3V5Zm7 3 6 4-6 4V8Z',
  revive:'M5 9a8 8 0 1 1-1 7M3 4v6h6m3 1v6m-3-3h6',
  ticket:'M3 8 19 4l2 6-2 2 1 3-16 5-2-6 2-2-1-4Zm11-2 3 11',
  upgrade:'M12 3 5 11h4v10h6V11h4l-7-8Z',
  fusion:'M8 7a4 4 0 1 0 0 8h3m5-8a4 4 0 1 1 0 8h-3m-4-4h6',
  lock:'M6 10h12v11H6V10Zm3 0V7a3 3 0 0 1 6 0v3m-3 4v3',
  star:'M12 2l3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1Z',
  close:'M5 5l14 14M19 5 5 19',
  check:'M4 12l5 5L20 6',
  arrow:'M4 12h16m-6-6 6 6-6 6',
  potion:'M8 3h8m-7 0v4l-4 7v7h14v-7l-4-7V3M7 15h10',
  cloud:'M7 19a5 5 0 0 1-1-10 7 7 0 0 1 13-1 5 5 0 0 1-1 11H7Zm5-8v7m-3-4 3-3 3 3',
};

const filled = new Set(['star','xp']);

export function icon(name: string, className=''): string {
  const path=paths[name]??paths.quest;
  const fill=filled.has(name)?'currentColor':'none';
  return `<svg class="r-icon ${className}" viewBox="0 0 24 24" aria-hidden="true" fill="${fill}" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`;
}

export const iconPath = (name: string): string => paths[name] ?? paths.hero;
