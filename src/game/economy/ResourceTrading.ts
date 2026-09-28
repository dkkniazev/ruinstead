import type { ResourceCounts, ResourceType } from '../gathering/ResourceTypes';
export type SellableResource = Exclude<ResourceType,'coins'>;
export const RESOURCE_SALE_PRICES:Record<SellableResource,number>={wood:1,stone:1,metal:3,crystal:12,fiber:4};
/** Selling is atomic; callers must check settlement access before invoking. */
export function sellStoredResource(storage:ResourceCounts,type:string,amount:number):number {
  if(!Object.hasOwn(RESOURCE_SALE_PRICES,type)||!Number.isSafeInteger(amount)||amount<=0)return 0;
  const id=type as SellableResource;
  if((storage[id]??0)<amount)return 0;
  const coins=amount*RESOURCE_SALE_PRICES[id];
  if(!Number.isSafeInteger(coins)||!Number.isSafeInteger(storage.coins+coins))return 0;
  storage[id]=(storage[id]??0)-amount;storage.coins+=coins;return coins;
}
