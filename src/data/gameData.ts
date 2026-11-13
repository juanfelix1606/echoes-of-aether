export type ZoneId = 'village' | 'forest' | 'dungeon'
export type ItemId = 'health-potion' | 'ether-potion' | 'iron-sword' | 'ranger-vest' | 'aether-shard'

export interface ItemDefinition {
  id: ItemId
  name: string
  description: string
  category: 'consumable' | 'weapon' | 'armor' | 'quest'
  price: number
  power?: number
}

export interface PlayerStats {
  level: number
  experience: number
  health: number
  maxHealth: number
  mana: number
  maxMana: number
  attack: number
  defense: number
  gold: number
}

export interface QuestState {
  accepted: boolean
  elderSpoken: boolean
  forestKills: number
  dungeonFound: boolean
  guardianDefeated: boolean
  shardRecovered: boolean
  returnedToElder: boolean
}

export interface SaveData {
  version: number
  player: PlayerStats
  inventory: Partial<Record<ItemId, number>>
  equipment: { weapon: ItemId | null; armor: ItemId | null }
  quest: QuestState
  zone: ZoneId
  x: number
  y: number
  muted: boolean
  forestChestOpened?: boolean
}

export const ITEMS: Record<ItemId, ItemDefinition> = {
  'health-potion': {
    id: 'health-potion',
    name: 'Health Potion',
    description: 'Restores 40 health.',
    category: 'consumable',
    price: 18,
    power: 40,
  },
  'ether-potion': {
    id: 'ether-potion',
    name: 'Ether Potion',
    description: 'Restores 30 mana.',
    category: 'consumable',
    price: 22,
    power: 30,
  },
  'iron-sword': {
    id: 'iron-sword',
    name: 'Iron Sword',
    description: 'A sturdy blade. Attack +4.',
    category: 'weapon',
    price: 55,
    power: 4,
  },
  'ranger-vest': {
    id: 'ranger-vest',
    name: 'Ranger Vest',
    description: 'Light armor. Defense +2.',
    category: 'armor',
    price: 48,
    power: 2,
  },
  'aether-shard': {
    id: 'aether-shard',
    name: 'Aether Shard',
    description: 'A fragment that hums with the Core’s fading light.',
    category: 'quest',
    price: 0,
  },
}

export const NEW_GAME: SaveData = {
  version: 1,
  player: {
    level: 1,
    experience: 0,
    health: 100,
    maxHealth: 100,
    mana: 40,
    maxMana: 40,
    attack: 12,
    defense: 2,
    gold: 35,
  },
  inventory: { 'health-potion': 3, 'ether-potion': 1 },
  equipment: { weapon: null, armor: null },
  quest: {
    accepted: false,
    elderSpoken: false,
    forestKills: 0,
    dungeonFound: false,
    guardianDefeated: false,
    shardRecovered: false,
    returnedToElder: false,
  },
  zone: 'village',
  x: 470,
  y: 290,
  muted: false,
}

export const ZONE_NAMES: Record<ZoneId, string> = {
  village: 'Greenleaf Village',
  forest: 'Whispering Forest',
  dungeon: 'Ancient Dungeon',
}
