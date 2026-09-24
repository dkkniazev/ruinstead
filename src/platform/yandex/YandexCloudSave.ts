import {
  LOCAL_SAVE_KEY,
  LOCAL_SAVE_META_KEY,
} from '../../game/state/SaveKeys';
import {
  SAVE_SCHEMA_VERSION,
  type GameState,
} from '../../game/state/GameState';
import type { YandexPlayer } from './YandexSdk';

const CLOUD_KEY = 'ruinsteadSave';
const CLOUD_META_KEY = 'ruinsteadSaveMeta';
const SAVE_DEBOUNCE_MS = 5000;

type SaveMeta = {
  savedAt: number;
  version: number;
};

let player: YandexPlayer | undefined;
let saveTimer: number | undefined;
let latestState: GameState | undefined;

function readSavedAt(value: unknown): number {
  if (!value || typeof value !== 'object') return 0;

  const savedAt = (value as Partial<SaveMeta>).savedAt;

  return typeof savedAt === 'number' && Number.isFinite(savedAt)
    ? Math.max(0, savedAt)
    : 0;
}

function readLocalState(): GameState | undefined {
  try {
    const raw = window.localStorage.getItem(LOCAL_SAVE_KEY);
    return raw ? (JSON.parse(raw) as GameState) : undefined;
  } catch {
    return undefined;
  }
}

function readLocalSavedAt(): number {
  try {
    const raw = window.localStorage.getItem(
      LOCAL_SAVE_META_KEY,
    );
    return raw ? readSavedAt(JSON.parse(raw)) : 0;
  } catch {
    return 0;
  }
}

export function resolveYandexSaveSource(
  hasCloudState: boolean,
  cloudSavedAt: number,
  hasLocalState: boolean,
  localSavedAt: number,
): 'cloud' | 'local' | 'none' {
  if (hasCloudState && !hasLocalState) return 'cloud';
  if (hasLocalState && !hasCloudState) return 'local';

  if (hasCloudState && hasLocalState) {
    if (cloudSavedAt > localSavedAt) return 'cloud';
    if (localSavedAt > cloudSavedAt) return 'local';
  }

  return 'none';
}

async function writeLatestState(
  flush: boolean,
): Promise<void> {
  const stateToSave = latestState;
  const activePlayer = player;

  if (!stateToSave || !activePlayer) return;

  await activePlayer.setData(
    {
      [CLOUD_KEY]: stateToSave,
      [CLOUD_META_KEY]: {
        savedAt: stateToSave.savedAt,
        version: stateToSave.schemaVersion,
      },
    },
    flush,
  );
}

export async function initializeYandexCloudSave(
  yandexPlayer: YandexPlayer,
): Promise<void> {
  player = yandexPlayer;

  try {
    const cloud = await player.getData([
      CLOUD_KEY,
      CLOUD_META_KEY,
    ]);
    const cloudState =
      cloud[CLOUD_KEY] as GameState | undefined;
    const cloudSavedAt = readSavedAt(
      cloud[CLOUD_META_KEY],
    );
    const localState = readLocalState();
    const localSavedAt = readLocalSavedAt();
    const source = resolveYandexSaveSource(
      cloudState !== undefined,
      cloudSavedAt,
      localState !== undefined,
      localSavedAt,
    );

    if (source === 'cloud' && cloudState) {
      window.localStorage.setItem(
        LOCAL_SAVE_KEY,
        JSON.stringify(cloudState),
      );
      window.localStorage.setItem(
        LOCAL_SAVE_META_KEY,
        JSON.stringify({
          savedAt: cloudSavedAt,
          version:
            cloudState.schemaVersion ??
            SAVE_SCHEMA_VERSION,
        }),
      );
    } else if (source === 'local' && localState) {
      await player.setData(
        {
          [CLOUD_KEY]: localState,
          [CLOUD_META_KEY]: {
            savedAt: localSavedAt,
            version:
              localState.schemaVersion ??
              SAVE_SCHEMA_VERSION,
          },
        },
        true,
      );
    }
  } catch (error) {
    console.warn(
      'Yandex cloud save initialization failed.',
      error,
    );
  }
}

export function queueYandexCloudSave(
  state: GameState,
): void {
  if (!player) return;

  latestState = state;

  if (saveTimer !== undefined) {
    window.clearTimeout(saveTimer);
  }

  saveTimer = window.setTimeout(() => {
    saveTimer = undefined;

    void writeLatestState(false).catch(
      (error: unknown) => {
        console.warn(
          'Yandex cloud save failed.',
          error,
        );
      },
    );
  }, SAVE_DEBOUNCE_MS);
}

export async function flushYandexCloudSave(): Promise<void> {
  if (saveTimer !== undefined) {
    window.clearTimeout(saveTimer);
    saveTimer = undefined;
  }

  try {
    await writeLatestState(true);
  } catch (error) {
    console.warn(
      'Yandex cloud save flush failed.',
      error,
    );
  }
}
