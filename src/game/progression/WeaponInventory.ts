import {
  WEAPON_ORDER,
  isWeaponId,
  type WeaponId,
} from '../combat/WeaponDefinitions';

export const MAX_WEAPON_LEVEL = 10;
export const MAX_WEAPON_STARS = 5;
export const MAX_WEAPON_SLOTS = 5;

export const WEAPON_SLOT_UNLOCK_LEVELS =
  [1, 5, 10, 15, 20] as const;

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
    multiplier: 1.2,
    color: '#79dc77',
  },
  rare: {
    id: 'rare',
    name: 'Редкое',
    multiplier: 1.45,
    color: '#73b9ff',
  },
  epic: {
    id: 'epic',
    name: 'Эпическое',
    multiplier: 1.75,
    color: '#d99cff',
  },
  legendary: {
    id: 'legendary',
    name: 'Легендарное',
    multiplier: 2.1,
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

export type WeaponLoadoutSelection = {
  weaponId: WeaponId;
  rarity: WeaponRarityId;
  stars: number;
};

export type WeaponInventoryState = {
  variants: WeaponVariantState[];
  /**
   * Legacy per-family selection. Kept for migration and the forge panel.
   * Runtime combat equipment uses loadout.
   */
  equipped:
    Partial<
      Record<
        WeaponId,
        WeaponSelection
      >
    >;
  loadout:
    Array<
      WeaponLoadoutSelection |
      null
    >;
  primarySlot: number;
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
    loadout: [
      {
        weaponId: 'axe',
        rarity: 'common',
        stars: 0,
      },
      null,
      null,
      null,
      null,
    ],
    primarySlot: 0,
  };
}

export function getUnlockedWeaponSlotCount(
  playerLevel: number,
): number {
  const level =
    Math.max(
      1,
      Math.floor(playerLevel),
    );

  let count = 1;

  for (
    let index = 1;
    index <
      WEAPON_SLOT_UNLOCK_LEVELS.length;
    index += 1
  ) {
    if (
      level >=
      WEAPON_SLOT_UNLOCK_LEVELS[
        index
      ]
    ) {
      count =
        index + 1;
    }
  }

  return Math.min(
    MAX_WEAPON_SLOTS,
    count,
  );
}

export function getWeaponSlotUnlockLevel(
  slotIndex: number,
): number {
  const safe =
    Math.max(
      0,
      Math.min(
        MAX_WEAPON_SLOTS - 1,
        Math.floor(slotIndex),
      ),
    );

  return (
    WEAPON_SLOT_UNLOCK_LEVELS[
      safe
    ] ?? 20
  );
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
  const starMultiplier =
    Math.pow(
      1.15,
      safeStars,
    );

  return (
    levelMultiplier *
    WEAPON_RARITIES[
      rarity
    ].multiplier *
    starMultiplier
  );
}

export function listOwnedWeaponOptions(
  inventory: WeaponInventoryState,
  weaponId?: WeaponId,
): OwnedWeaponOption[] {
  const options:
    OwnedWeaponOption[] = [];

  for (
    const rarity of
    WEAPON_RARITY_ORDER
  ) {
    const variants =
      inventory.variants.filter(
        (variant) =>
          variant.rarity ===
            rarity &&
          (
            !weaponId ||
            variant.weaponId ===
              weaponId
          ),
      );

    for (
      const variant of variants
    ) {
      variant.starCounts.forEach(
        (count, stars) => {
          if (count <= 0) {
            return;
          }

          options.push({
            weaponId:
              variant.weaponId,
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
  }

  return options.sort(
    (a, b) => {
      const weaponDiff =
        WEAPON_ORDER.indexOf(
          a.weaponId,
        ) -
        WEAPON_ORDER.indexOf(
          b.weaponId,
        );

      if (
        weaponId === undefined &&
        weaponDiff !== 0
      ) {
        return weaponDiff;
      }

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
    return profileFromSelection(
      inventory,
      {
        weaponId,
        rarity:
          selection.rarity,
        stars:
          selection.stars,
      },
    );
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

export function getEquippedLoadoutProfiles(
  inventory: WeaponInventoryState,
  playerLevel: number,
): Array<
  EquippedWeaponProfile | null
> {
  normalizeWeaponLoadoutForPlayerLevel(
    inventory,
    playerLevel,
  );

  return inventory.loadout.map(
    (selection, index) => {
      if (
        !selection ||
        index >=
          getUnlockedWeaponSlotCount(
            playerLevel,
          ) ||
        !hasOwnedLoadoutSelection(
          inventory,
          selection,
        )
      ) {
        return null;
      }

      return profileFromSelection(
        inventory,
        selection,
      );
    },
  );
}

export function getPrimaryWeaponProfile(
  inventory: WeaponInventoryState,
  playerLevel: number,
): EquippedWeaponProfile {
  const profiles =
    getEquippedLoadoutProfiles(
      inventory,
      playerLevel,
    );
  const primary =
    profiles[
      inventory.primarySlot
    ] ??
    profiles.find(
      (
        profile,
      ): profile is EquippedWeaponProfile =>
        Boolean(profile),
    );

  return (
    primary ?? {
      weaponId: 'axe',
      rarity: 'common',
      level: 1,
      stars: 0,
    }
  );
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

export function equipWeaponInSlot(
  inventory: WeaponInventoryState,
  slotIndex: number,
  selection:
    WeaponLoadoutSelection,
  playerLevel: number,
): {
  success: boolean;
  reason?: string;
} {
  const safeSlot =
    Math.floor(slotIndex);
  const unlocked =
    getUnlockedWeaponSlotCount(
      playerLevel,
    );

  if (
    safeSlot < 0 ||
    safeSlot >= unlocked
  ) {
    return {
      success: false,
      reason:
        `Слот откроется на Lv.${getWeaponSlotUnlockLevel(safeSlot)}`,
    };
  }

  const normalized = {
    weaponId:
      selection.weaponId,
    rarity:
      selection.rarity,
    stars:
      clampStars(
        selection.stars,
      ),
  };

  if (
    !hasOwnedLoadoutSelection(
      inventory,
      normalized,
    )
  ) {
    return {
      success: false,
      reason:
        'Такого оружия нет в инвентаре',
    };
  }

  const duplicateSlot =
    inventory.loadout.findIndex(
      (entry, index) =>
        index !== safeSlot &&
        entry?.weaponId ===
          normalized.weaponId &&
        entry.rarity ===
          normalized.rarity,
    );

  if (duplicateSlot >= 0) {
    return {
      success: false,
      reason:
        'Один тип и одна редкость нельзя экипировать дважды',
    };
  }

  const familyCount =
    inventory.loadout.filter(
      (entry, index) =>
        index !== safeSlot &&
        entry?.weaponId === normalized.weaponId,
    ).length;

  if (familyCount >= 2) {
    return {
      success: false,
      reason: 'Одно семейство оружия занимает не более двух слотов',
    };
  }

  inventory.loadout[
    safeSlot
  ] = normalized;
  inventory.equipped[
    normalized.weaponId
  ] = {
    rarity:
      normalized.rarity,
    stars:
      normalized.stars,
  };

  if (
    !inventory.loadout[
      inventory.primarySlot
    ]
  ) {
    inventory.primarySlot =
      safeSlot;
  }

  return {
    success: true,
  };
}

export function clearWeaponSlot(
  inventory: WeaponInventoryState,
  slotIndex: number,
): boolean {
  const safe =
    Math.floor(slotIndex);

  if (
    safe < 0 ||
    safe >=
      MAX_WEAPON_SLOTS ||
    !inventory.loadout[safe]
  ) {
    return false;
  }

  inventory.loadout[safe] =
    null;

  if (
    inventory.primarySlot ===
      safe
  ) {
    inventory.primarySlot =
      firstOccupiedSlot(
        inventory.loadout,
      );
  }

  return true;
}

export function setPrimaryWeaponSlot(
  inventory: WeaponInventoryState,
  slotIndex: number,
  playerLevel: number,
): boolean {
  const safe =
    Math.floor(slotIndex);

  if (
    safe < 0 ||
    safe >=
      getUnlockedWeaponSlotCount(
        playerLevel,
      ) ||
    !inventory.loadout[safe]
  ) {
    return false;
  }

  inventory.primarySlot =
    safe;

  return true;
}

export function normalizeWeaponLoadoutForPlayerLevel(
  inventory: WeaponInventoryState,
  playerLevel: number,
): void {
  const unlocked =
    getUnlockedWeaponSlotCount(
      playerLevel,
    );

  while (
    inventory.loadout.length <
    MAX_WEAPON_SLOTS
  ) {
    inventory.loadout.push(
      null,
    );
  }
  inventory.loadout.length =
    MAX_WEAPON_SLOTS;

  const seen = new Set<string>();
  const familyCounts = new Map<WeaponId, number>();

  for (
    let index = 0;
    index <
      MAX_WEAPON_SLOTS;
    index += 1
  ) {
    const selection =
      inventory.loadout[
        index
      ];

    if (
      !selection ||
      !hasOwnedLoadoutSelection(
        inventory,
        selection,
      )
    ) {
      inventory.loadout[
        index
      ] = null;
      continue;
    }

    const key =
      `${selection.weaponId}:${selection.rarity}`;

    if (
      seen.has(key) ||
      (familyCounts.get(selection.weaponId) ?? 0) >= 2
    ) {
      inventory.loadout[
        index
      ] = null;
      continue;
    }

    seen.add(key);
    familyCounts.set(
      selection.weaponId,
      (familyCounts.get(selection.weaponId) ?? 0) + 1,
    );
  }

  if (
    !inventory.loadout.some(
      Boolean,
    )
  ) {
    const fallback =
      getStrongestOwnedOption(
        inventory,
        'axe',
      ) ??
      listOwnedWeaponOptions(
        inventory,
      )[0];

    if (fallback) {
      inventory.loadout[0] = {
        weaponId:
          fallback.weaponId,
        rarity:
          fallback.rarity,
        stars:
          fallback.stars,
      };
    }
  }

  if (
    inventory.primarySlot < 0 ||
    inventory.primarySlot >=
      unlocked ||
    !inventory.loadout[
      inventory.primarySlot
    ]
  ) {
    inventory.primarySlot =
      firstOccupiedSlot(
        inventory.loadout,
      );
  }
}

export function addWeaponDrop(
  inventory: WeaponInventoryState,
  weaponId: WeaponId,
  rarity: WeaponRarityId,
): OwnedWeaponOption | null {
  if (isWeaponDropCapped(inventory, weaponId, rarity)) return null;
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

/** A mastered tier also retires weaker copies; better rarities still progress. */
export function isWeaponDropCapped(inventory: WeaponInventoryState, weaponId: WeaponId, rarity: WeaponRarityId): boolean {
  return inventory.variants.some(variant => variant.weaponId === weaponId
    && WEAPON_RARITY_ORDER.indexOf(variant.rarity) >= WEAPON_RARITY_ORDER.indexOf(rarity)
    && (variant.starCounts[MAX_WEAPON_STARS] ?? 0) > 0);
}

export function cappedWeaponMaterials(rarity: WeaponRarityId): { crystal: number; fiber: number } {
  const tier = WEAPON_RARITY_ORDER.indexOf(rarity);
  return {
    crystal: 1 + Math.min(3, tier),
    fiber: 1 + Math.floor((tier + 1) / 2),
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

  for (
    let index = 0;
    index <
      inventory.loadout.length;
    index += 1
  ) {
    const equipped =
      inventory.loadout[
        index
      ];

    if (
      equipped?.weaponId ===
        profile.weaponId &&
      equipped.rarity ===
        profile.rarity &&
      equipped.stars ===
        profile.stars
    ) {
      inventory.loadout[
        index
      ] = {
        ...equipped,
        stars:
          profile.stars + 1,
      };
      break;
    }
  }

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
    loadout:
      new Array(
        MAX_WEAPON_SLOTS,
      ).fill(null),
    primarySlot: 0,
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

  const rawLoadout =
    Array.isArray(
      raw?.loadout,
    )
      ? raw.loadout
      : [];

  rawLoadout
    .slice(
      0,
      MAX_WEAPON_SLOTS,
    )
    .forEach(
      (entry, index) => {
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
          return;
        }

        const selection = {
          weaponId:
            item.weaponId,
          rarity:
            item.rarity,
          stars:
            clampStars(
              nonNegativeInt(
                item.stars,
                0,
              ),
            ),
        };

        if (
          hasOwnedLoadoutSelection(
            inventory,
            selection,
          )
        ) {
          inventory.loadout[
            index
          ] = selection;
        }
      },
    );

  if (
    !inventory.loadout.some(
      Boolean,
    )
  ) {
    const legacyCandidates =
      WEAPON_ORDER
        .map(
          (weaponId) => {
            const selection =
              inventory.equipped[
                weaponId
              ];

            return selection
              ? {
                  weaponId,
                  rarity:
                    selection.rarity,
                  stars:
                    selection.stars,
                }
              : null;
          },
        )
        .filter(
          (
            entry,
          ): entry is WeaponLoadoutSelection =>
            Boolean(entry),
        );

    legacyCandidates
      .slice(
        0,
        MAX_WEAPON_SLOTS,
      )
      .forEach(
        (entry, index) => {
          inventory.loadout[
            index
          ] = entry;
        },
      );
  }

  inventory.primarySlot =
    Math.max(
      0,
      Math.min(
        MAX_WEAPON_SLOTS - 1,
        nonNegativeInt(
          raw?.primarySlot,
          0,
        ),
      ),
    );

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

  const loadout:
    WeaponInventoryState[
      'loadout'
    ] =
    new Array(
      MAX_WEAPON_SLOTS,
    ).fill(null);
  const first =
    allowedWeaponIds.find(
      (weaponId) =>
        Boolean(
          equipped[weaponId],
        ),
    ) ?? 'axe';
  const firstSelection =
    equipped[first];

  if (firstSelection) {
    loadout[0] = {
      weaponId: first,
      rarity:
        firstSelection.rarity,
      stars:
        firstSelection.stars,
    };
  }

  return {
    variants,
    equipped,
    loadout,
    primarySlot: 0,
  };
}

function profileFromSelection(
  inventory: WeaponInventoryState,
  selection:
    WeaponLoadoutSelection,
): EquippedWeaponProfile {
  const variant =
    getWeaponVariant(
      inventory,
      selection.weaponId,
      selection.rarity,
    );

  return {
    weaponId:
      selection.weaponId,
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

function hasOwnedLoadoutSelection(
  inventory: WeaponInventoryState,
  selection:
    WeaponLoadoutSelection,
): boolean {
  return hasOwnedSelection(
    inventory,
    selection.weaponId,
    {
      rarity:
        selection.rarity,
      stars:
        selection.stars,
    },
  );
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

function firstOccupiedSlot(
  loadout:
    WeaponInventoryState[
      'loadout'
    ],
): number {
  const index =
    loadout.findIndex(
      Boolean,
    );

  return (
    index >= 0
      ? index
      : 0
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
