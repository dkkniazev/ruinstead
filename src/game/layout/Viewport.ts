import type Phaser from 'phaser';

export const LOGICAL_WIDTH = 1280;
export const LOGICAL_HEIGHT = 720;
export const LOGICAL_ASPECT = LOGICAL_WIDTH / LOGICAL_HEIGHT;
export const COMPACT_LANDSCAPE_VISIBLE_HEIGHT = 650;

const COMPACT_LANDSCAPE_MIN_ASPECT = 1.95;
const COMPACT_LANDSCAPE_MAX_WIDTH = 1000;
const COMPACT_LANDSCAPE_MAX_HEIGHT = 600;
const MAX_RENDER_SCALE = 3;
const MAX_DEVICE_PIXEL_RATIO = 2;

export type ViewportMetrics = {
  viewportWidth: number;
  viewportHeight: number;
  cssWidth: number;
  cssHeight: number;
  cssScale: number;
  devicePixelRatio: number;
  renderScale: number;
  renderWidth: number;
  renderHeight: number;
  canvasCssZoom: number;
  compactLandscape: boolean;
};

function positiveFinite(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function isCompactLandscapeViewport(
  viewportWidth: number,
  viewportHeight: number,
): boolean {
  const safeWidth = positiveFinite(viewportWidth, LOGICAL_WIDTH);
  const safeHeight = positiveFinite(viewportHeight, LOGICAL_HEIGHT);

  return (
    safeWidth <= COMPACT_LANDSCAPE_MAX_WIDTH &&
    safeHeight <= COMPACT_LANDSCAPE_MAX_HEIGHT &&
    safeWidth / safeHeight >= COMPACT_LANDSCAPE_MIN_ASPECT
  );
}

export function calculateViewportMetrics(
  viewportWidth: number,
  viewportHeight: number,
  devicePixelRatio = 1,
): ViewportMetrics {
  const safeWidth = positiveFinite(viewportWidth, LOGICAL_WIDTH);
  const safeHeight = positiveFinite(viewportHeight, LOGICAL_HEIGHT);
  const compactLandscape = isCompactLandscapeViewport(safeWidth, safeHeight);
  const cssScale = compactLandscape
    ? safeHeight / COMPACT_LANDSCAPE_VISIBLE_HEIGHT
    : Math.min(
        safeWidth / LOGICAL_WIDTH,
        safeHeight / LOGICAL_HEIGHT,
      );

  const cssWidth = Math.max(
    1,
    Math.round(
      compactLandscape ? safeWidth : LOGICAL_WIDTH * cssScale,
    ),
  );
  const cssHeight = Math.max(
    1,
    Math.round(
      compactLandscape ? safeHeight : LOGICAL_HEIGHT * cssScale,
    ),
  );

  const safeDevicePixelRatio = Math.min(
    MAX_DEVICE_PIXEL_RATIO,
    Math.max(1, positiveFinite(devicePixelRatio, 1)),
  );
  const renderScale = Math.min(
    MAX_RENDER_SCALE,
    cssScale * safeDevicePixelRatio,
  );
  const renderWidth = Math.max(
    1,
    Math.round(
      compactLandscape
        ? cssWidth * safeDevicePixelRatio
        : LOGICAL_WIDTH * renderScale,
    ),
  );
  const renderHeight = Math.max(
    1,
    Math.round(
      compactLandscape
        ? cssHeight * safeDevicePixelRatio
        : LOGICAL_HEIGHT * renderScale,
    ),
  );

  return {
    viewportWidth: safeWidth,
    viewportHeight: safeHeight,
    cssWidth,
    cssHeight,
    cssScale,
    devicePixelRatio: safeDevicePixelRatio,
    renderScale,
    renderWidth,
    renderHeight,
    canvasCssZoom: compactLandscape
      ? 1 / safeDevicePixelRatio
      : renderScale > 0
        ? cssScale / renderScale
        : 1,
    compactLandscape,
  };
}

export function getBrowserViewportMetrics(): ViewportMetrics {
  const viewportWidth =
    document.documentElement.clientWidth ||
    window.innerWidth ||
    LOGICAL_WIDTH;
  const viewportHeight =
    document.documentElement.clientHeight ||
    window.innerHeight ||
    LOGICAL_HEIGHT;

  return calculateViewportMetrics(
    viewportWidth,
    viewportHeight,
    window.devicePixelRatio || 1,
  );
}

export function getBrowserLogicalViewport(): {
  logicalWidth: number;
  logicalHeight: number;
  compactLandscape: boolean;
} {
  const metrics = getBrowserViewportMetrics();

  if (!metrics.compactLandscape) {
    return {
      logicalWidth: LOGICAL_WIDTH,
      logicalHeight: LOGICAL_HEIGHT,
      compactLandscape: false,
    };
  }

  return {
    logicalWidth: metrics.viewportWidth / metrics.cssScale,
    logicalHeight: COMPACT_LANDSCAPE_VISIBLE_HEIGHT,
    compactLandscape: true,
  };
}

export function configureLogicalCamera(scene: Phaser.Scene): void {
  const renderWidth = scene.scale.width;
  const renderHeight = scene.scale.height;
  const browserViewport = getBrowserLogicalViewport();
  const zoom = browserViewport.compactLandscape
    ? renderHeight / COMPACT_LANDSCAPE_VISIBLE_HEIGHT
    : Math.min(
        renderWidth / LOGICAL_WIDTH,
        renderHeight / LOGICAL_HEIGHT,
      );

  const camera = scene.cameras.main;
  camera.setViewport(0, 0, renderWidth, renderHeight);
  camera.setZoom(zoom);
  camera.centerOn(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2);
}

export function syncGameViewport(game: Phaser.Game): ViewportMetrics {
  const metrics = getBrowserViewportMetrics();

  if (Math.abs(game.scale.zoom - metrics.canvasCssZoom) > 0.0001) {
    game.scale.setZoom(metrics.canvasCssZoom);
  }

  if (
    game.scale.width !== metrics.renderWidth ||
    game.scale.height !== metrics.renderHeight
  ) {
    game.scale.resize(metrics.renderWidth, metrics.renderHeight);
  } else {
    game.scale.refresh();
  }

  return metrics;
}
