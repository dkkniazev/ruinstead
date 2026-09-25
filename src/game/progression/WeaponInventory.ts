import {
  WEAPON_ORDER,
  isWeaponId,
  type WeaponId,
} from '../combat/WeaponDefinitions';

export const MAX_WEAPON_LEVEL = 10;
export const MAX_WEAPON_STARS = 5;

export const WEAPON_RARITY_ORDER = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
] as const;

export type WeaponRarityId =
  (typeof WEAPON_RARITY_ORDER)[number];

export type WeaponRarityDefinition = {
  id: WeaponRarityId;
  name: string;
  multiplier: number;
  color: string;
};

export const WEAPON_RARITIES:
  Record<
    WeaponRarityId,
    WeaponRarityDefinition
  > = {
  common: {
    id: 'common',
    name: 'Обычное',
    multiplier: 1,
    color: '#f3f1e8',
  },
  uncommon: {
    id: 'uncommon',
    name: 'Необычное',
    multiplier: 2,
    color: '#79dc77',
  },
  rare: {
    id: 'rare',
    name: 'Редкое',
    multiplier: 4,
    color: '#73b9ff',
  },
  epic: {
    id: 'epic',
    name: 'Эпическое',
    multiplier: 8,
    color: '#d99cff',
  },
  legendary: {
    id: 'legendary',
    name: 'Легендарное',
    multiplier: 16,
    color: '#ffd45c',
  },
};

export type WeaponVariantState = {
  weaponId: WeaponId;
  rarity: WeaponRarityId;
  level: number;
  starCounts: number[];
};

export type WeaponSelection = {
  rarity: WeaponRarityId;
  stars: number;
};

export type WeaponInventoryState = {
  variants: WeaponVariantState[];
  equipped:
    Partial<
      Record<
        WeaponId,
        WeaponSelection
      >
    >;
};

export type EquippedWeaponProfile = {
  weaponId: WeaponId;
  rarity: WeaponRarityId;
  level: number;
  stars: number;
};

export type OwnedWeaponOption =
  EquippedWeaponProfile & {
    count: number;
    rarityName: string;
    rarityColor: string;
    damageMultiplier: number;
  };

export function createDefaultWeaponInventory():
  WeaponInventoryState {
  return {
    variants: [
      {
        weaponId: 'axe',
        rarity: 'common',
        level: 1,
        starCounts:
          emptyStarCounts(1),
      },
    ],
    equipped: {
      axe: {
        rarity: 'common',
        stars: 0,
      },
    },
  };
}

export function isWeaponRarityId(
  value: unknown,
): value is WeaponRarityId {
  return (
    typeof value === 'string' &&
    (
      WEAPON_RARITY_ORDER as readonly string[]
    ).includes(value)
  );
}

export function getWeaponDamageMultiplier(
  level: number,
  rarity: WeaponRarityId,
  stars: number,
): number {
  const safeLevel =
    clampWeaponLevel(level);
  const safeStars =
    clampStars(stars);

  const levelMultiplier =
    1 +
    (
      safeLevel - 1
    ) *
      0.15;

  return (
    levelMultiplier *
    WEAPON_RARITIES[
      rarity
    ].multiplier *
    Math.pow(
      1.5,
      safeStars,
    )
  );
}

export function listOwnedWeaponOptions(
  inventory: WeaponInventoryState,
  weaponId: WeaponId,
): OwnedWeaponOption[] {
  const options:
    OwnedWeaponOption[] = [];

  for (
    const rarity of
    WEAPON_RARITY_ORDER
  ) {
    const variant =
      getWeaponVariant(
        inventory,
        weaponId,
        rarity,
      );

    if (!variant) {
      continue;
    }

    variant.starCounts.forEach(
      (count, stars) => {
        if (count <= 0) {
          return;
        }

        options.push({
          weaponId,
          rarity,
          level:
            clampWeaponLevel(
              variant.level,
            ),
          stars:
            clampStars(stars),
          count,
          rarityName:
            WEAPON_RARITIES[
              rarity
            ].name,
          rarityColor:
            WEAPON_RARITIES[
              rarity
            ].color,
          damageMultiplier:
            getWeaponDamageMultiplier(
              variant.level,
              rarity,
              stars,
            ),
        });
      },
    );
  }

  return options.sort(
    (a, b) => {
      const rarityDiff =
        WEAPON_RARITY_ORDER
          .indexOf(a.rarity) -
        WEAPON_RARITY_ORDER
          .indexOf(b.rarity);

      if (rarityDiff !== 0) {
        return rarityDiff;
      }

      if (
        a.stars !== b.stars
      ) {
        return (
          a.stars - b.stars
        );
      }

      return (
        a.level - b.level
      );
    },
  );
}

export function getEquippedWeaponProfile(
  inventory: WeaponInventoryState,
  weaponId: WeaponId,
): EquippedWeaponProfile {
  const selection =
    inventory.equipped[
      weaponId
    ];

  if (
    selection &&
    hasOwnedSelection(
      inventory,
      weaponId,
      selection,
    )
  ) {
    const variant =
      getWeaponVariant(
        inventory,
        weaponId,
        selection.rarity,
      );

    return {
      weaponId,
      rarity:
        selection.rarity,
      level:
        clampWeaponLevel(
          variant?.level ?? 1,
        ),
      stars:
        clampStars(
          selection.stars,
        ),
    };
  }

  const best =
    getStrongestOwnedOption(
      inventory,
      weaponId,
    );

  if (best) {
    inventory.equipped[
      weaponId
    ] = {
      rarity: best.rarity,
      stars: best.stars,
    };

    return {
      weaponId,
      rarity: best.rarity,
      level: best.level,
      stars: best.stars,
    };
  }

  return {
    weaponId,
    rarity: 'common',
    level: 1,
    stars: 0,
  };
}

export function equipWeaponVariant(
  inventory: WeaponInventoryState,
  weaponId: WeaponId,
  rarity: WeaponRarityId,
  stars: number,
): boolean {
  const selection = {
    rarity,
    stars:
      clampStars(stars),
  };

  if (
    !hasOwnedSelection(
      inventory,
      weaponId,
      selection,
    )
  ) {
    return false;
  }

  inventory.equipped[
    weaponId
  ] = selection;

  return true;
}

export function addWeaponDrop(
  inventory: WeaponInventoryState,
  weaponId: WeaponId,
  rarity: WeaponRarityId,
): OwnedWeaponOption {
  let variant =
    getWeaponVariant(
      inventory,
      weaponId,
      rarity,
    );

  if (!variant) {
    variant = {
      weaponId,
      rarity,
      level: 1,
      starCounts:
        emptyStarCounts(),
    };
    inventory.variants.push(
      variant,
    );
  }

  variant.starCounts[0] =
    (
      variant.starCounts[0] ??
      0
    ) + 1;

  if (
    !inventory.equipped[
      weaponId
    ]
  ) {
    inventory.equipped[
      weaponId
    ] = {
      rarity,
      stars: 0,
    };
  }

  return {
    weaponId,
    rarity,
    level:
      clampWeaponLevel(
        variant.level,
      ),
    stars: 0,
    count:
      variant.starCounts[0],
    rarityName:
      WEAPON_RARITIES[
        rarity
      ].name,
    rarityColor:
      WEAPON_RARITIES[
        rarity
      ].color,
    damageMultiplier:
      getWeaponDamageMultiplier(
        variant.level,
        rarity,
        0,
      ),
  };
}

export function upgradeEquippedWeaponLevel(
  inventory: WeaponInventoryState,
  weaponId: WeaponId,
): number | null {
  const profile =
    getEquippedWeaponProfile(
      inventory,
      weaponId,
    );
  const variant =
    getWeaponVariant(
      inventory,
      weaponId,
      profile.rarity,
    );

  if (
    !variant ||
    variant.level >=
      MAX_WEAPON_LEVEL
  ) {
    return null;
  }

  variant.level += 1;
  variant.level =
    clampWeaponLevel(
      variant.level,
    );

  return variant.level;
}

export function canFuseWeapon(
  inventory: WeaponInventoryState,
  profile: EquippedWeaponProfile,
): boolean {
  if (
    profile.stars >=
    MAX_WEAPON_STARS
  ) {
    return false;
  }

  const variant =
    getWeaponVariant(
      inventory,
      profile.weaponId,
      profile.rarity,
    );

  return (
    (
      variant?.starCounts[
        profile.stars
      ] ?? 0
    ) >= 2
  );
}

export function fuseWeapon(
  inventory: WeaponInventoryState,
  profile: EquippedWeaponProfile,
): EquippedWeaponProfile | null {
  if (
    !canFuseWeapon(
      inventory,
      profile,
    )
  ) {
    return null;
  }

  const variant =
    getWeaponVariant(
      inventory,
      profile.weaponId,
      profile.rarity,
    );

  if (!variant) {
    return null;
  }

  variant.starCounts[
    profile.stars
  ] -= 2;
  variant.starCounts[
    profile.stars + 1
  ] =
    (
      variant.starCounts[
        profile.stars + 1
      ] ?? 0
    ) + 1;

  inventory.equipped[
    profile.weaponId
  ] = {
    rarity:
      profile.rarity,
    stars:
      profile.stars + 1,
  };

  return {
    weaponId:
      profile.weaponId,
    rarity:
      profile.rarity,
    level:
      variant.level,
    stars:
      profile.stars + 1,
  };
}

export function sanitizeWeaponInventory(
  value: unknown,
  legacyLevels:
    Partial<
      Record<WeaponId, number>
    >,
  legacyUnlocked:
    readonly unknown[],
): WeaponInventoryState {
  const raw =
    asRecord(value);
  const rawVariants =
    Array.isArray(
      raw?.variants,
    )
      ? raw.variants
      : [];
  const variants:
    WeaponVariantState[] = [];

  for (
    const entry of
    rawVariants
  ) {
    const item =
      asRecord(entry);

    if (
      !isWeaponId(
        item?.weaponId,
      ) ||
      !isWeaponRarityId(
        item?.rarity,
      )
    ) {
      continue;
    }

    const rawStars =
      Array.isArray(
        item.starCounts,
      )
        ? item.starCounts
        : [];

    const starCounts =
      emptyStarCounts();

    for (
      let stars = 0;
      stars <=
      MAX_WEAPON_STARS;
      stars += 1
    ) {
      starCounts[stars] =
        nonNegativeInt(
          rawStars[stars],
          0,
        );
    }

    if (
      starCounts.every(
        (count) =>
          count <= 0,
      )
    ) {
      continue;
    }

    variants.push({
      weaponId:
        item.weaponId,
      rarity:
        item.rarity,
      level:
        clampWeaponLevel(
          nonNegativeInt(
            item.level,
            1,
          ),
        ),
      starCounts,
    });
  }

  if (variants.length === 0) {
    const unlocked =
      new Set<WeaponId>([
        'axe',
      ]);

    for (
      const candidate of
      legacyUnlocked
    ) {
      if (
        isWeaponId(candidate)
      ) {
        unlocked.add(
          candidate,
        );
      }
    }

    for (
      const weaponId of
      unlocked
    ) {
      variants.push({
        weaponId,
        rarity: 'common',
        level:
          clampWeaponLevel(
            Math.max(
              1,
              legacyLevels[
                weaponId
              ] ?? 1,
            ),
          ),
        starCounts:
          emptyStarCounts(1),
      });
    }
  }

  if (
    !variants.some(
      (variant) =>
        variant.weaponId ===
          'axe' &&
        variant.rarity ===
          'common',
    )
  ) {
    variants.push({
      weaponId: 'axe',
      rarity: 'common',
      level: 1,
      starCounts:
        emptyStarCounts(1),
    });
  }

  const inventory:
    WeaponInventoryState = {
    variants,
    equipped: {},
  };

  const rawEquipped =
    asRecord(
      raw?.equipped,
    );

  for (
    const weaponId of
    WEAPON_ORDER
  ) {
    const selection =
      asRecord(
        rawEquipped?.[
          weaponId
        ],
      );

    if (
      isWeaponRarityId(
        selection?.rarity,
      )
    ) {
      equipWeaponVariant(
        inventory,
        weaponId,
        selection.rarity,
        nonNegativeInt(
          selection.stars,
          0,
        ),
      );
    }

    if (
      !inventory.equipped[
        weaponId
      ]
    ) {
      const best =
        getStrongestOwnedOption(
          inventory,
          weaponId,
        );

      if (best) {
        inventory.equipped[
          weaponId
        ] = {
          rarity:
            best.rarity,
          stars:
            best.stars,
        };
      }
    }
  }

  return inventory;
}

export function normalizeWeaponInventoryForCurrentProgression(
  inventory: WeaponInventoryState,
  allowedWeaponIds:
    readonly WeaponId[],
): WeaponInventoryState {
  const allowed =
    new Set<WeaponId>(
      allowedWeaponIds,
    );
  const variants:
    WeaponVariantState[] = [];
  const equipped:
    WeaponInventoryState[
      'equipped'
    ] = {};

  for (
    const weaponId of
    WEAPON_ORDER
  ) {
    if (!allowed.has(weaponId)) {
      continue;
    }

    const sources =
      inventory.variants
        .filter(
          (variant) =>
            variant.weaponId ===
            weaponId,
        );

    const starCounts =
      emptyStarCounts();
    let level = 1;

    for (
      const source of
      sources
    ) {
      level = Math.max(
        level,
        clampWeaponLevel(
          source.level,
        ),
      );

      for (
        let stars = 0;
        stars <=
        MAX_WEAPON_STARS;
        stars += 1
      ) {
        starCounts[stars] +=
          source.starCounts[
            stars
          ] ?? 0;
      }
    }

    if (
      starCounts.every(
        (count) =>
          count <= 0,
      )
    ) {
      starCounts[0] = 1;
    }

    variants.push({
      weaponId,
      rarity: 'common',
      level,
      starCounts,
    });

    let selectedStars = 0;

    for (
      let stars =
        MAX_WEAPON_STARS;
      stars >= 0;
      stars -= 1
    ) {
      if (
        starCounts[stars] >
        0
      ) {
        selectedStars =
          stars;
        break;
      }
    }

    equipped[weaponId] = {
      rarity: 'common',
      stars:
        selectedStars,
    };
  }

  return {
    variants,
    equipped,
  };
}

function getWeaponVariant(
  inventory: WeaponInventoryState,
  weaponId: WeaponId,
  rarity: WeaponRarityId,
): WeaponVariantState | undefined {
  return inventory.variants.find(
    (variant) =>
      variant.weaponId ===
        weaponId &&
      variant.rarity ===
        rarity,
  );
}

function getStrongestOwnedOption(
  inventory: WeaponInventoryState,
  weaponId: WeaponId,
): OwnedWeaponOption | undefined {
  return listOwnedWeaponOptions(
    inventory,
    weaponId,
  ).sort(
    (a, b) =>
      b.damageMultiplier -
      a.damageMultiplier,
  )[0];
}

function hasOwnedSelection(
  inventory: WeaponInventoryState,
  weaponId: WeaponId,
  selection: WeaponSelection,
): boolean {
  const variant =
    getWeaponVariant(
      inventory,
      weaponId,
      selection.rarity,
    );

  return (
    (
      variant?.starCounts[
        clampStars(
          selection.stars,
        )
      ] ?? 0
    ) > 0
  );
}

function clampWeaponLevel(
  level: number,
): number {
  return Math.min(
    MAX_WEAPON_LEVEL,
    Math.max(
      1,
      Math.floor(level),
    ),
  );
}

function clampStars(
  stars: number,
): number {
  return Math.min(
    MAX_WEAPON_STARS,
    Math.max(
      0,
      Math.floor(stars),
    ),
  );
}

function emptyStarCounts(
  zeroStarCount = 0,
): number[] {
  const values =
    new Array(
      MAX_WEAPON_STARS + 1,
    ).fill(0);

  values[0] =
    zeroStarCount;

  return values;
}

function asRecord(
  value: unknown,
): Record<string, unknown> | undefined {
  return value &&
    typeof value === 'object'
    ? value as
        Record<
          string,
          unknown
        >
    : undefined;
}

function nonNegativeInt(
  value: unknown,
  fallback: number,
): number {
  return (
    typeof value ===
      'number' &&
    Number.isFinite(value)
      ? Math.max(
          0,
          Math.floor(value),
        )
      : fallback
  );
}
