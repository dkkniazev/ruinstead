import {
  getBackpackCapacity,
} from '../progression/UpgradeBalance';
import {
  RESOURCE_DEFINITIONS,
  RESOURCE_TYPES,
  cloneResourceCounts,
  emptyResourceCounts,
  type ResourceCounts,
  type ResourceType,
} from './ResourceTypes';

export type BackpackState = {
  carried: ResourceCounts;
  usedCapacity: number;
  capacity: number;
};

export class BackpackSystem {
  private readonly carried:
    ResourceCounts;

  private _capacity: number;

  constructor(
    backpackLevel: number,
    initial:
      ResourceCounts =
        emptyResourceCounts(),
  ) {
    this._capacity =
      getBackpackCapacity(
        backpackLevel,
      );

    this.carried =
      cloneResourceCounts(
        initial,
      );

    this.trimToCapacity();
  }

  get capacity(): number {
    return this._capacity;
  }

  setLevel(
    backpackLevel: number,
  ): void {
    this._capacity =
      getBackpackCapacity(
        backpackLevel,
      );
    this.trimToCapacity();
  }

  get state(): BackpackState {
    return {
      carried:
        cloneResourceCounts(
          this.carried,
        ),
      usedCapacity:
        Math.round(
          this.usedCapacity * 100,
        ) / 100,
      capacity:
        this.capacity,
    };
  }

  get usedCapacity(): number {
    let used = 0;

    for (
      const type of
      RESOURCE_TYPES
    ) {
      used +=
        (this.carried[type] ?? 0) *
        RESOURCE_DEFINITIONS[
          type
        ].weight;
    }

    return used;
  }

  canAccept(
    type: ResourceType,
    amount = 1,
  ): boolean {
    return (
      this.remainingCapacity >=
      RESOURCE_DEFINITIONS[
        type
      ].weight *
        amount
    );
  }

  add(
    type: ResourceType,
    amount = 1,
  ): number {
    const safeAmount =
      Math.max(
        0,
        Math.floor(amount),
      );

    if (safeAmount <= 0) {
      return 0;
    }

    const weight =
      RESOURCE_DEFINITIONS[
        type
      ].weight;
    const accepted =
      Math.min(
        safeAmount,
        Math.floor(
          this.remainingCapacity /
            weight,
        ),
      );

    if (accepted <= 0) {
      return 0;
    }

    this.carried[type] =
      (this.carried[type] ?? 0) +
      accepted;

    return accepted;
  }

  canSpend(
    cost: ResourceCounts,
  ): boolean {
    return RESOURCE_TYPES.every(
      (type) =>
        (this.carried[type] ?? 0) >=
        (cost[type] ?? 0),
    );
  }

  spend(
    cost: ResourceCounts,
  ): boolean {
    if (!this.canSpend(cost)) {
      return false;
    }

    for (
      const type of
      RESOURCE_TYPES
    ) {
      this.carried[type] =
        (this.carried[type] ?? 0) -
        (cost[type] ?? 0);
    }

    return true;
  }

  canAcceptBundle(
    contents: ResourceCounts,
  ): boolean {
    let weight = 0;

    for (
      const type of
      RESOURCE_TYPES
    ) {
      weight +=
        (contents[type] ?? 0) *
        RESOURCE_DEFINITIONS[
          type
        ].weight;
    }

    return (
      this.remainingCapacity >=
      weight
    );
  }

  addBundle(
    contents: ResourceCounts,
  ): void {
    for (
      const type of
      RESOURCE_TYPES
    ) {
      const amount =
        contents[type] ?? 0;

      if (amount > 0) {
        this.add(
          type,
          amount,
        );
      }
    }
  }

  deposit(): ResourceCounts {
    return this.takeAll();
  }

  takeAll(): ResourceCounts {
    const taken =
      cloneResourceCounts(
        this.carried,
      );

    for (
      const type of
      RESOURCE_TYPES
    ) {
      this.carried[type] = 0;
    }

    return taken;
  }

  private get remainingCapacity():
    number {
    return Math.max(
      0,
      this.capacity -
        this.usedCapacity,
    );
  }

  private trimToCapacity(): void {
    if (
      this.usedCapacity <=
      this.capacity
    ) {
      return;
    }

    for (
      const type of
      [...RESOURCE_TYPES].reverse()
    ) {
      const weight =
        RESOURCE_DEFINITIONS[
          type
        ].weight;

      while (
        (this.carried[type] ?? 0) > 0 &&
        this.usedCapacity >
          this.capacity
      ) {
        this.carried[type] =
          (this.carried[type] ?? 0) -
          1;

        if (
          this.usedCapacity <=
          this.capacity
        ) {
          break;
        }

        if (weight <= 0) {
          break;
        }
      }
    }
  }
}
