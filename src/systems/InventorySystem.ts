import { ITEMS, type ItemId, type SaveData } from '../data/gameData'

export class InventorySystem {
  constructor(private readonly save: SaveData) {}

  count(item: ItemId): number {
    return this.save.inventory[item] ?? 0
  }

  add(item: ItemId, quantity = 1): void {
    this.save.inventory[item] = this.count(item) + quantity
  }

  remove(item: ItemId, quantity = 1): boolean {
    const current = this.count(item)
    if (current < quantity) return false
    const next = current - quantity
    if (next === 0) delete this.save.inventory[item]
    else this.save.inventory[item] = next
    return true
  }

  equip(item: ItemId): boolean {
    const definition = ITEMS[item]
    if (definition.category !== 'weapon' && definition.category !== 'armor') return false
    if (this.count(item) < 1) return false

    const slot = definition.category === 'weapon' ? 'weapon' : 'armor'
    const previous = this.save.equipment[slot]
    if (previous) this.add(previous)
    this.remove(item)
    this.save.equipment[slot] = item
    return true
  }

  unequip(slot: 'weapon' | 'armor'): boolean {
    const item = this.save.equipment[slot]
    if (!item) return false
    this.add(item)
    this.save.equipment[slot] = null
    return true
  }

  getAttackBonus(): number {
    const weapon = this.save.equipment.weapon
    return weapon ? ITEMS[weapon].power ?? 0 : 0
  }

  getDefenseBonus(): number {
    const armor = this.save.equipment.armor
    return armor ? ITEMS[armor].power ?? 0 : 0
  }

  consume(item: ItemId): boolean {
    if (item !== 'health-potion' && item !== 'ether-potion') return false
    if (this.count(item) < 1) return false

    const restoredStat = item === 'health-potion' ? 'health' : 'mana'
    const maxStat = item === 'health-potion' ? 'maxHealth' : 'maxMana'
    if (this.save.player[restoredStat] >= this.save.player[maxStat]) return false
    this.remove(item)
    this.save.player[restoredStat] = Math.min(
      this.save.player[maxStat],
      this.save.player[restoredStat] + (ITEMS[item].power ?? 0),
    )
    return true
  }
}
