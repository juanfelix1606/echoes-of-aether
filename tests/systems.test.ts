import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NEW_GAME } from '../src/data/gameData'
import { InventorySystem } from '../src/systems/InventorySystem'
import { ProgressionSystem } from '../src/systems/ProgressionSystem'
import { QuestSystem } from '../src/systems/QuestSystem'
import { SaveSystem } from '../src/systems/SaveSystem'

const storage = new Map<string, string>()

beforeEach(() => {
  storage.clear()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  })
})

describe('saved games', () => {
  it('round-trips progression, equipment, quest, and position', () => {
    const save = structuredClone(NEW_GAME)
    save.player.experience = 30
    save.equipment.weapon = 'iron-sword'
    save.quest.forestKills = 4
    save.zone = 'forest'
    save.x = 280
    save.y = 510
    save.forestChestOpened = true
    expect(SaveSystem.save(save)).toBe(true)
    expect(SaveSystem.load()).toEqual(save)
  })

  it('rejects malformed or unsupported saves without crashing', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    storage.set('echoes-of-aether-save', '{')
    expect(SaveSystem.load()).toBeUndefined()
    storage.set('echoes-of-aether-save', JSON.stringify({
      ...NEW_GAME,
      player: { level: 1, health: 100 },
    }))
    expect(SaveSystem.load()).toBeUndefined()
    storage.set('echoes-of-aether-save', JSON.stringify({ ...NEW_GAME, version: 99 }))
    expect(SaveSystem.load()).toBeUndefined()
    warning.mockRestore()
  })

  it('persists audio settings without creating a save game', () => {
    expect(SaveSystem.setMuted(true)).toBe(true)
    expect(SaveSystem.hasSave()).toBe(false)
    expect(SaveSystem.fresh().muted).toBe(true)
  })
})

describe('progression and inventory', () => {
  it('levels up at the threshold and carries excess experience', () => {
    const player = structuredClone(NEW_GAME.player)
    player.health = 1
    expect(ProgressionSystem.awardExperience(player, 80)).toBe(1)
    expect(player.level).toBe(2)
    expect(player.experience).toBe(5)
    expect(player.health).toBe(player.maxHealth)
  })

  it('only consumes potions when they can restore a stat and caps restoration', () => {
    const save = structuredClone(NEW_GAME)
    const inventory = new InventorySystem(save)
    expect(inventory.consume('health-potion')).toBe(false)
    expect(inventory.count('health-potion')).toBe(3)
    save.player.health = 90
    expect(inventory.consume('health-potion')).toBe(true)
    expect(save.player.health).toBe(100)
    expect(inventory.count('health-potion')).toBe(2)
  })

  it('equips owned equipment and preserves the previously equipped item', () => {
    const save = structuredClone(NEW_GAME)
    const inventory = new InventorySystem(save)
    expect(inventory.equip('iron-sword')).toBe(false)
    inventory.add('iron-sword', 2)
    expect(inventory.equip('iron-sword')).toBe(true)
    expect(inventory.equip('iron-sword')).toBe(true)
    expect(inventory.getAttackBonus()).toBe(4)
    expect(inventory.count('iron-sword')).toBe(1)
  })
})

describe('quest objective', () => {
  it('advances through the main quest and ends only after returning', () => {
    const state = structuredClone(NEW_GAME.quest)
    const quest = new QuestSystem(state)
    expect(quest.getObjective()).toContain('elder')
    state.accepted = state.elderSpoken = true
    expect(quest.getObjective()).toContain('0/4')
    state.forestKills = 4
    expect(quest.getObjective()).toContain('Dungeon')
    state.dungeonFound = true
    expect(quest.getObjective()).toContain('Guardian')
    state.guardianDefeated = true
    expect(quest.getObjective()).toContain('fragment')
    state.shardRecovered = true
    expect(quest.isComplete()).toBe(false)
    state.returnedToElder = true
    expect(quest.isComplete()).toBe(true)
  })
})
