let webgl2Available: boolean | undefined;

/** Probe once; release the temporary GPU context before creating the world. */
export function supports3DWorld(): boolean {
  if (webgl2Available !== undefined) return webgl2Available;
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    webgl2Available = !!gl;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webgl2Available = false;
  }
  return webgl2Available;
}

/** A DEV-only fallback fixture never changes the normal production renderer. */
export function usesLegacyWorldArt(): boolean {
  return (import.meta.env.DEV && new URLSearchParams(location.search).get('renderer') === '2d') || !supports3DWorld();
}
