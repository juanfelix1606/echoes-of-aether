import { ITEMS, NEW_GAME, type ItemId, type SaveData } from '../data/gameData'

const SAVE_KEY = 'echoes-of-aether-save'
const SETTINGS_KEY = 'echoes-of-aether-settings'

export class SaveSystem {
  static load(): SaveData | undefined {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (!raw) return undefined
      const parsed: unknown = JSON.parse(raw)
      if (!SaveSystem.isSaveData(parsed)) {
        console.warn('Saved game data is invalid or from an unsupported version; starting a new game.')
        return undefined
      }
      return parsed
    } catch (error) {
      console.warn('Saved game data could not be read; starting a new game.', error)
      return undefined
    }
  }

  static save(data: SaveData): boolean {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ ...data, version: 1 }))
      return true
    } catch (error) {
      console.error('Unable to save the game.', error)
      return false
    }
  }

  static hasSave(): boolean {
    try {
      return localStorage.getItem(SAVE_KEY) !== null
    } catch (error) {
      console.error('Unable to access saved games.', error)
      return false
    }
  }

  static fresh(): SaveData {
    const data = structuredClone(NEW_GAME)
    try {
      const setting = localStorage.getItem(SETTINGS_KEY)
      if (setting === 'muted' || setting === 'unmuted') data.muted = setting === 'muted'
    } catch (error) {
      console.error('Unable to access audio settings.', error)
    }
    return data
  }

  static setMuted(muted: boolean): boolean {
    try {
      localStorage.setItem(SETTINGS_KEY, muted ? 'muted' : 'unmuted')
      return true
    } catch (error) {
      console.error('Unable to save audio settings.', error)
      return false
    }
  }

  private static isSaveData(value: unknown): value is SaveData {
    if (!value || typeof value !== 'object') return false
    const save = value as Partial<SaveData>
    const player = save.player
    const quest = save.quest
    const inventory = save.inventory
    const equipment = save.equipment
    const nonnegative = (number: unknown): number is number =>
      typeof number === 'number' && Number.isFinite(number) && number >= 0
    const whole = (number: unknown): number is number =>
      nonnegative(number) && Number.isInteger(number)
    return (
      save.version === 1 &&
      !!player && typeof player === 'object' &&
      whole(player.level) && player.level > 0 &&
      whole(player.experience) && whole(player.gold) &&
      nonnegative(player.maxHealth) && player.maxHealth > 0 &&
      nonnegative(player.maxMana) && player.maxMana > 0 &&
      nonnegative(player.health) && player.health > 0 && player.health <= player.maxHealth &&
      nonnegative(player.mana) && player.mana <= player.maxMana &&
      nonnegative(player.attack) && nonnegative(player.defense) &&
      !!inventory && typeof inventory === 'object' && !Array.isArray(inventory) &&
      Object.entries(inventory).every(([id, count]) => Object.hasOwn(ITEMS, id) && whole(count)) &&
      !!equipment && typeof equipment === 'object' &&
      (equipment.weapon === null || (typeof equipment.weapon === 'string' && Object.hasOwn(ITEMS, equipment.weapon) && ITEMS[equipment.weapon as ItemId].category === 'weapon')) &&
      (equipment.armor === null || (typeof equipment.armor === 'string' && Object.hasOwn(ITEMS, equipment.armor) && ITEMS[equipment.armor as ItemId].category === 'armor')) &&
      !!quest && typeof quest === 'object' &&
      typeof quest.accepted === 'boolean' && typeof quest.elderSpoken === 'boolean' &&
      whole(quest.forestKills) && quest.forestKills <= 4 &&
      typeof quest.dungeonFound === 'boolean' && typeof quest.guardianDefeated === 'boolean' &&
      typeof quest.shardRecovered === 'boolean' && typeof quest.returnedToElder === 'boolean' &&
      ['village', 'forest', 'dungeon'].includes(save.zone ?? '') &&
      nonnegative(save.x) && save.x >= 32 && save.x <= 1168 &&
      nonnegative(save.y) && save.y >= 32 && save.y <= 668 &&
      typeof save.muted === 'boolean' &&
      (save.forestChestOpened === undefined || typeof save.forestChestOpened === 'boolean')
    )
  }
}
