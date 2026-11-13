import type { ItemId } from '../data/gameData'

export interface Drop {
  item: ItemId
  chance: number
}

export function rollDrops(table: readonly Drop[], random: () => number = Math.random): ItemId[] {
  return table.filter((drop) => random() < drop.chance).map((drop) => drop.item)
}
