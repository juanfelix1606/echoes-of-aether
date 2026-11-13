import Phaser from 'phaser'
import { generateTextures } from '../assets/generateTextures'
import { createTerrain } from '../data/terrain'
import {
  ITEMS,
  ZONE_NAMES,
  type ItemId,
  type SaveData,
  type ZoneId,
} from '../data/gameData'
import { AudioSystem } from '../systems/AudioSystem'
import { rollDrops, type Drop } from '../systems/DropSystem'
import { InventorySystem } from '../systems/InventorySystem'
import { ProgressionSystem } from '../systems/ProgressionSystem'
import { QuestSystem } from '../systems/QuestSystem'
import { SaveSystem } from '../systems/SaveSystem'

interface EnemyDefinition {
  name: string
  texture: string
  health: number
  damage: number
  speed: number
  experience: number
  gold: number
  drops: readonly Drop[]
}

const ENEMIES: Record<string, EnemyDefinition> = {
  slime: { name: 'Corrupted Slime', texture: 'slime', health: 28, damage: 6, speed: 42, experience: 18, gold: 4, drops: [{ item: 'health-potion', chance: 0.15 }] },
  goblin: { name: 'Forest Goblin', texture: 'goblin', health: 48, damage: 10, speed: 58, experience: 30, gold: 8, drops: [{ item: 'health-potion', chance: 0.25 }] },
  skeleton: { name: 'Skeleton Warrior', texture: 'skeleton', health: 62, damage: 13, speed: 48, experience: 40, gold: 10, drops: [{ item: 'ether-potion', chance: 0.25 }] },
  guardian: { name: 'Corrupted Guardian', texture: 'guardian', health: 300, damage: 20, speed: 38, experience: 180, gold: 100, drops: [] },
}

interface MovementKeys {
  up: Phaser.Input.Keyboard.Key
  down: Phaser.Input.Keyboard.Key
  left: Phaser.Input.Keyboard.Key
  right: Phaser.Input.Keyboard.Key
}

export class GameScene extends Phaser.Scene {
  private saveData!: SaveData
  private inventory!: InventorySystem
  private quest!: QuestSystem
  private audio!: AudioSystem
  private player!: Phaser.Physics.Arcade.Sprite
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private movementKeys!: MovementKeys
  private actionKeys!: Record<'attack' | 'interact' | 'inventory' | 'potion' | 'skill' | 'save', Phaser.Input.Keyboard.Key>
  private facing = new Phaser.Math.Vector2(0, 1)
  private enemies: Phaser.Physics.Arcade.Sprite[] = []
  private zoneObjects: Phaser.GameObjects.GameObject[] = []
  private obstacles!: Phaser.Physics.Arcade.StaticGroup
  private obstacleCollider?: Phaser.Physics.Arcade.Collider
  private enemyColliders: Phaser.Physics.Arcade.Collider[] = []
  private terrainMap?: Phaser.Tilemaps.Tilemap
  private hud!: Phaser.GameObjects.Container
  private healthBar!: Phaser.GameObjects.Graphics
  private manaBar!: Phaser.GameObjects.Graphics
  private experienceBar!: Phaser.GameObjects.Graphics
  private joystickKnob!: Phaser.GameObjects.Arc
  private hudText!: Phaser.GameObjects.Text
  private objectiveText!: Phaser.GameObjects.Text
  private toastText!: Phaser.GameObjects.Text
  private dialoguePanel?: Phaser.GameObjects.Container
  private inventoryPanel?: Phaser.GameObjects.Container
  private pausedPanel?: Phaser.GameObjects.Container
  private endPanel?: Phaser.GameObjects.Container
  private attackAt = 0
  private skillAt = 0
  private interactionAt = 0
  private damageAt = 0
  private trapAt = 0
  private toastUntil = 0
  private joystickPointer = -1
  private joystickOrigin = new Phaser.Math.Vector2()
  private joystickVector = new Phaser.Math.Vector2()
  private touchAttack = false
  private touchInteract = false
  private touchPotion = false
  private touchSkill = false
  private dialogText?: Phaser.GameObjects.Text
  private dialogLines: string[] = []
  private dialogIndex = 0
  private dialogueComplete?: () => void
  private paused = false
  private nextAutosave = 0
  private worldWidth = 1200
  private worldHeight = 700

  constructor() {
    super('GameScene')
  }

  handleBack(): void {
    this.togglePause()
  }

  saveOnBackground(): void {
    if (this.player?.active && this.saveData.player.health > 0) this.saveGame(false)
  }

  init(data: { save?: SaveData }): void {
    this.paused = false
    this.dialoguePanel = undefined
    this.dialogueComplete = undefined
    this.inventoryPanel = undefined
    this.pausedPanel = undefined
    this.endPanel = undefined
    this.joystickPointer = -1
    this.joystickVector.set(0, 0)
    this.attackAt = 0
    this.skillAt = 0
    this.interactionAt = 0
    this.damageAt = 0
    this.touchAttack = false
    this.touchInteract = false
    this.touchPotion = false
    this.touchSkill = false
    this.saveData = data.save ?? SaveSystem.fresh()
    this.inventory = new InventorySystem(this.saveData)
    this.quest = new QuestSystem(this.saveData.quest)
    this.audio = new AudioSystem(this.saveData.muted)
  }

  create(): void {
    generateTextures(this)
    this.physics.world.setBounds(32, 32, this.worldWidth - 64, this.worldHeight - 64)
    this.obstacles = this.physics.add.staticGroup()
    this.player = this.physics.add.sprite(this.saveData.x, this.saveData.y, 'hero')
    this.player.setCollideWorldBounds(true).setDepth(this.player.y)
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight)
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09)
    this.cameras.main.setDeadzone(100, 70)

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.movementKeys = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as MovementKeys
    this.actionKeys = {
      attack: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      interact: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      inventory: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.I),
      potion: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P),
      skill: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      save: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F5),
    }

    this.createHud()
    this.enterZone(this.saveData.zone)
    this.input.on('pointerdown', this.onPointerDown, this)
    this.input.on('pointermove', this.onPointerMove, this)
    this.input.on('pointerup', this.onPointerUp, this)
    this.input.on('pointerupoutside', this.onPointerUp, this)
    this.input.keyboard?.on('keydown-ESC', this.togglePause, this)
    this.input.keyboard?.on('keydown-ENTER', this.advanceDialogue, this)
    this.input.keyboard?.on('keydown-I', this.toggleInventory, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this)
    this.nextAutosave = this.time.now + 15000
    this.refreshHud()
    if (!this.saveData.quest.accepted) {
      this.time.delayedCall(500, () =>
        this.showDialogue(['You awaken beneath a silver-leaf tree. A village elder waits nearby.'], 'Begin your adventure'),
      )
    }
  }

  update(time: number, delta: number): void {
    if (this.dialoguePanel) {
      if (Phaser.Input.Keyboard.JustDown(this.actionKeys.interact) || this.touchInteract) this.advanceDialogue()
      this.touchInteract = false
      return
    }
    if (this.paused || this.inventoryPanel || !this.player.active) return

    const horizontal =
      Number(this.cursors.right.isDown || this.movementKeys.right.isDown) -
      Number(this.cursors.left.isDown || this.movementKeys.left.isDown)
    const vertical =
      Number(this.cursors.down.isDown || this.movementKeys.down.isDown) -
      Number(this.cursors.up.isDown || this.movementKeys.up.isDown)
    const movement = new Phaser.Math.Vector2(horizontal, vertical)
    if (this.joystickPointer >= 0 && this.joystickVector.lengthSq() > 0) movement.copy(this.joystickVector)
    if (movement.lengthSq() > 1) movement.normalize()

    if (movement.lengthSq() > 0) {
      this.facing.copy(movement).normalize()
      this.player.setVelocity(movement.x * 175, movement.y * 175)
      this.player.setFlipX(movement.x < 0)
      this.player.setAngle(Math.sin(time / 95) * 3)
    } else {
      this.player.setVelocity(0, 0)
      this.player.setAngle(0)
    }
    this.player.setDepth(this.player.y)
    this.updateEnemies(time, delta)
    if (this.paused) return

    if (Phaser.Input.Keyboard.JustDown(this.actionKeys.attack) || this.touchAttack) this.basicAttack(time)
    if (Phaser.Input.Keyboard.JustDown(this.actionKeys.skill) || this.touchSkill) this.useSkill(time)
    if (Phaser.Input.Keyboard.JustDown(this.actionKeys.interact) || this.touchInteract) this.interact(time)
    if (Phaser.Input.Keyboard.JustDown(this.actionKeys.potion) || this.touchPotion) this.usePotion()
    if (Phaser.Input.Keyboard.JustDown(this.actionKeys.save)) this.saveGame()

    if (this.saveData.zone === 'dungeon' && Math.abs(this.player.x - 680) < 38 && Math.abs(this.player.y - 360) < 38 && time >= this.trapAt) {
      this.trapAt = time + 1800
      this.damagePlayer(12, this.player)
      this.showToast('A floor trap snaps shut!')
    }

    this.touchAttack = false
    this.touchInteract = false
    this.touchPotion = false
    this.touchSkill = false
    if (time >= this.nextAutosave) {
      this.saveGame(false)
      this.nextAutosave = time + 15000
    }
    if (this.toastUntil && time > this.toastUntil) this.toastText.setVisible(false)
    this.refreshBars()
  }

  private createHud(): void {
    this.hud = this.add.container(0, 0).setScrollFactor(0).setDepth(2000)
    this.hud.add(this.add.rectangle(330, 43, 620, 70, 0x111b17, 0.9))
    this.healthBar = this.add.graphics()
    this.manaBar = this.add.graphics()
    this.experienceBar = this.add.graphics()
    this.hud.add([this.healthBar, this.manaBar, this.experienceBar])
    this.hudText = this.add.text(28, 12, '', { color: '#f1ead5', fontSize: '12px', fontFamily: 'Arial' })
    this.objectiveText = this.add.text(28, 76, '', {
      color: '#f0d894',
      backgroundColor: '#142019cc',
      fontSize: '14px',
      fontFamily: 'Arial',
      padding: { x: 8, y: 5 },
      wordWrap: { width: 410 },
    })
    this.toastText = this.add.text(480, 150, '', {
      color: '#fff1c8',
      backgroundColor: '#18241fee',
      fontSize: '17px',
      fontStyle: 'bold',
      fontFamily: 'Arial',
      padding: { x: 12, y: 8 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2200).setVisible(false)
    this.hud.add([this.hudText, this.objectiveText])
    this.createTouchControls()
    const journal = this.add.text(650, 18, 'QUEST', {
      color: '#fff1c8', backgroundColor: '#705331', fontSize: '16px', padding: { x: 12, y: 10 },
    }).setScrollFactor(0).setInteractive({ useHandCursor: true })
    this.onUiPointerDown(journal, () => {
      if (!this.paused && !this.dialoguePanel) this.showDialogue([this.quest.getObjective()], 'The Shattered Crystal')
    })
    const inventory = this.add.text(750, 18, 'BAG', {
      color: '#fff1c8', backgroundColor: '#705331', fontSize: '16px', padding: { x: 14, y: 10 },
    }).setScrollFactor(0).setInteractive({ useHandCursor: true })
    this.onUiPointerDown(inventory, () => this.toggleInventory())
    const pause = this.add.text(835, 18, 'PAUSE', {
      color: '#fff1c8', backgroundColor: '#705331', fontSize: '16px', padding: { x: 14, y: 10 },
    }).setScrollFactor(0).setInteractive({ useHandCursor: true })
    this.onUiPointerDown(pause, () => this.togglePause())
    this.hud.add([journal, inventory, pause])
    this.refreshHud()
  }

  private createTouchControls(): void {
    const joystickBase = this.add.circle(100, 431, 51, 0x111b17, 0.42)
      .setStrokeStyle(3, 0xe9d596, 0.55).setScrollFactor(0).setDepth(2001)
    this.joystickKnob = this.add.circle(100, 431, 22, 0xddd0a4, 0.52)
      .setScrollFactor(0).setDepth(2002)
    const buttonSpecs = [
      { x: 856, y: 438, label: 'ATK', action: 'attack' },
      { x: 775, y: 461, label: 'USE', action: 'potion' },
      { x: 778, y: 367, label: 'TALK', action: 'interact' },
      { x: 868, y: 346, label: 'SKILL', action: 'skill' },
    ] as const
    const joystickRing = joystickBase
    this.hud.add([joystickRing, this.joystickKnob])
    for (const spec of buttonSpecs) {
      const circle = this.add.circle(spec.x, spec.y, 37, 0x7d6033, 0.72)
        .setStrokeStyle(3, 0xf3d894, 0.8).setScrollFactor(0).setDepth(2001)
        .setInteractive()
      const label = this.add.text(spec.x, spec.y, spec.label, {
        color: '#fff3d4',
        fontFamily: 'Arial',
        fontSize: '12px',
        fontStyle: 'bold',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(2002)
      this.hud.add([circle, label])
      circle.setData('action', spec.action)
    }
  }

  private enterZone(zone: ZoneId): void {
    if (this.obstacleCollider) {
      this.physics.world.removeCollider(this.obstacleCollider)
      this.obstacleCollider = undefined
    }
    this.enemyColliders.forEach((collider) => this.physics.world.removeCollider(collider))
    this.enemyColliders = []
    this.zoneObjects.forEach((object) => object.destroy())
    this.zoneObjects = []
    this.terrainMap?.destroy()
    this.enemies.forEach((enemy) => enemy.destroy())
    this.enemies = []
    this.obstacles.clear(true, true)
    this.saveData.zone = zone
    this.audio.setZone(zone)
    this.saveData.x = this.player.x
    this.saveData.y = this.player.y

    this.terrainMap = createTerrain(this, zone, this.worldWidth, this.worldHeight)
    this.player.setVelocity(0, 0)
    this.player.setDepth(this.player.y)
    this.obstacleCollider = this.physics.add.collider(this.player, this.obstacles)

    if (zone === 'village') this.buildVillage()
    if (zone === 'forest') this.buildForest()
    if (zone === 'dungeon') this.buildDungeon()
    this.addZoneHeader(ZONE_NAMES[zone])
    this.refreshHud()
  }

  private buildVillage(): void {
    for (const [x, y] of [[145, 145], [950, 145], [150, 545], [950, 545]]) this.createTree(x, y)
    this.createBuilding(350, 205, 'ELDER’S HALL')
    this.createBuilding(690, 205, 'TRADER')
    this.createNpc(465, 315, 'Elder Rowan', 'elder')
    this.createNpc(695, 325, 'Mira the Merchant', 'merchant')
    this.createLandmark(590, 490, 'SAVE')
    this.createPortal(1110, 360, 'forest', 'WHISPERING FOREST')
  }

  private buildForest(): void {
    const trees = [[135, 125], [265, 535], [450, 145], [625, 520], [760, 130], [970, 540], [1030, 175]]
    for (const [x, y] of trees) this.createTree(x, y, true)
    this.createPortal(60, 360, 'village', 'GREENLEAF VILLAGE')
    if (this.saveData.quest.forestKills >= 4) {
      this.createPortal(1110, 360, 'dungeon', 'ANCIENT DUNGEON')
    } else {
      this.createLandmark(1110, 360, 'DUNGEON SEALED')
    }
    const enemies = [
      ['slime', 350, 290], ['slime', 510, 440], ['slime', 740, 330],
      ['goblin', 880, 230], ['goblin', 910, 455],
    ] as const
    enemies.forEach(([kind, x, y]) => this.createEnemy(kind, x, y))
    this.createLandmark(600, 285, 'Whispering Grove')
    this.createChest(590, 490)
  }

  private buildDungeon(): void {
    this.createPortal(60, 360, 'forest', 'WHISPERING FOREST')
    for (let x = 185; x < 1080; x += 190) {
      this.createPillar(x, 105)
      this.createPillar(x, 590)
    }
    this.createLandmark(590, 120, 'ANCIENT DUNGEON')
    this.createTrap(680, 360)
    this.createEnemy('skeleton', 320, 340)
    this.createEnemy('skeleton', 490, 260)
    this.createEnemy('skeleton', 510, 450)
    if (!this.saveData.quest.guardianDefeated) this.createEnemy('guardian', 870, 360)
    else if (!this.saveData.quest.shardRecovered) this.createShard(870, 360)
  }

  private createBuilding(x: number, y: number, title: string): void {
    const body = this.track(this.add.rectangle(x, y, 170, 110, 0x584638).setStrokeStyle(4, 0xb9965a))
    this.track(this.add.triangle(x, y - 70, -100, 60, 0, -20, 100, 60, 0x793f38).setStrokeStyle(4, 0xb9965a))
    body.setDepth(y)
    const details = this.add.graphics().setDepth(y + 1)
    details.fillStyle(0x302a27).fillRect(x - 15, y + 9, 30, 45)
    details.fillStyle(0x845d3c).fillRect(x - 12, y + 12, 24, 42)
    details.fillStyle(0xd0a75c).fillRect(x + 5, y + 33, 3, 3)
    for (const windowX of [x - 55, x + 36]) {
      details.fillStyle(0x302a27).fillRect(windowX, y - 26, 22, 24)
      details.fillStyle(0xe4c882).fillRect(windowX + 3, y - 23, 16, 18)
      details.fillStyle(0x765540).fillRect(windowX + 10, y - 23, 2, 18).fillRect(windowX + 3, y - 15, 16, 2)
    }
    this.track(details)
    this.track(this.add.text(x, y + 42, title, { color: '#f4d795', fontSize: '13px', fontStyle: 'bold' }).setOrigin(0.5).setDepth(y + 1))
  }

  private createTree(x: number, y: number, blocking = false): void {
    const tree = this.add.image(x, y, 'tree').setDepth(y + 20)
    this.track(tree)
    if (blocking) {
      const blocker = this.obstacles.create(x, y + 15, 'tree')
      blocker.setVisible(false)
      blocker.setSize(25, 16).setOffset(12, 20).refreshBody()
    }
  }

  private createNpc(x: number, y: number, name: string, role: string): void {
    const npc = this.track(this.add.image(x, y, role === 'elder' ? 'elder' : 'merchant').setDepth(y))
    this.track(this.add.text(x, y - 30, name, { color: '#fff0bd', fontSize: '14px', backgroundColor: '#19241dcc', padding: { x: 4, y: 2 } }).setOrigin(0.5).setDepth(y + 1))
    npc.setData('interactable', role)
  }

  private createPortal(x: number, y: number, target: ZoneId, label: string): void {
    const portal = this.track(this.add.ellipse(x, y, 62, 92, 0x5d91a4, 0.62).setStrokeStyle(4, 0xc3e6dc))
    portal.setData('interactable', 'portal')
    portal.setData('targetZone', target)
    this.track(this.add.text(x, y + 62, label, { color: '#f1e6bf', fontSize: '12px', backgroundColor: '#142019cc', padding: { x: 5, y: 3 } }).setOrigin(0.5))
  }

  private createLandmark(x: number, y: number, label: string): void {
    const marker = this.track(this.add.circle(x, y, 25, 0xc5ac5c, 0.56).setStrokeStyle(2, 0xf3d894))
    if (label === 'SAVE') marker.setData('interactable', 'save')
    if (label === 'DUNGEON SEALED') marker.setData('interactable', 'sealed')
    marker.setData('label', label)
    this.track(this.add.text(x, y + 38, label, { color: '#f1e6bf', fontSize: '12px', backgroundColor: '#142019cc', padding: { x: 5, y: 3 } }).setOrigin(0.5))
  }

  private createChest(x: number, y: number): void {
    const chest = this.track(this.add.rectangle(x, y, 34, 24, 0x9b6736).setStrokeStyle(3, 0xf3d894).setDepth(y))
    chest.setData('interactable', 'chest')
    chest.setData('opened', this.saveData.forestChestOpened === true)
    if (this.saveData.forestChestOpened) chest.setFillStyle(0x6b655a)
    this.track(this.add.rectangle(x, y - 5, 38, 6, 0xc99a50).setDepth(y + 1))
  }

  private createTrap(x: number, y: number): void {
    const trap = this.track(this.add.rectangle(x, y, 76, 46, 0x973e42, 0.55).setStrokeStyle(3, 0xd9806e).setDepth(y))
    this.track(this.add.text(x, y, '▲  ▲  ▲', { color: '#f0b7a3', fontSize: '17px', fontStyle: 'bold' }).setOrigin(0.5).setDepth(y + 1))
    trap.setData('label', 'Floor trap')
  }

  private createPillar(x: number, y: number): void {
    this.track(this.add.rectangle(x, y, 64, 86, 0x272934).setStrokeStyle(5, 0x656574).setDepth(y))
  }

  private createEnemy(kind: string, x: number, y: number): void {
    const definition = ENEMIES[kind]
    const enemy = this.physics.add.sprite(x, y, definition.texture)
    enemy.setDepth(y)
    enemy.setData('kind', kind)
    enemy.setData('health', definition.health)
    enemy.setData('maxHealth', definition.health)
    enemy.setData('attackAt', 0)
    enemy.setData('warning', false)
    enemy.setData('warningAt', 0)
    enemy.setData('phaseTwo', false)
    enemy.setData('nextPattern', 'bolt')
    enemy.setData('originX', x)
    enemy.setData('originY', y)
    enemy.setData('healthBar', this.track(this.add.graphics().setDepth(y + 1)))
    this.enemies.push(enemy)
    this.enemyColliders.push(this.physics.add.collider(enemy, this.obstacles))
  }

  private createShard(x: number, y: number): void {
    const shard = this.track(this.add.star(x, y, 5, 12, 24, 0x8be4dd).setStrokeStyle(3, 0xe6fff2).setDepth(y))
    shard.setData('interactable', 'shard')
    this.track(this.add.text(x, y + 39, 'AETHER FRAGMENT', { color: '#ddfff4', fontSize: '12px', backgroundColor: '#142019cc', padding: { x: 4, y: 3 } }).setOrigin(0.5))
  }

  private addZoneHeader(name: string): void {
    this.track(this.add.rectangle(this.worldWidth / 2, 38, 430, 42, 0x142019, 0.86).setScrollFactor(0).setDepth(1999))
    this.track(this.add.text(480, 38, name.toUpperCase(), {
      color: '#f3d894',
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2000))
  }

  private updateEnemies(time: number, _delta: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.active) continue
      const kind = enemy.getData('kind') as string
      const definition = ENEMIES[kind]
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y)
      const boss = kind === 'guardian'
      if (boss && distance < 510 && !enemy.getData('musicStarted')) {
        enemy.setData('musicStarted', true)
        this.audio.setZone('boss')
      }
      const phaseTwo = boss && Number(enemy.getData('health')) <= 150
      const healthBar = enemy.getData('healthBar') as Phaser.GameObjects.Graphics
      healthBar.clear()
      healthBar.fillStyle(0x302320, 0.95).fillRect(enemy.x - (boss ? 38 : 17), enemy.y - (boss ? 48 : 25), boss ? 76 : 34, 5)
      healthBar.fillStyle(boss ? 0xb64d54 : 0x84b967, 1)
        .fillRect(enemy.x - (boss ? 38 : 17), enemy.y - (boss ? 48 : 25), (boss ? 76 : 34) * Number(enemy.getData('health')) / Number(enemy.getData('maxHealth')), 5)
      if (phaseTwo && !enemy.getData('phaseTwo')) {
        enemy.setData('phaseTwo', true)
        enemy.setTint(0xd999e8)
        this.showToast('The Guardian enters its enraged phase!')
      }

      if (boss && enemy.getData('warning')) {
        enemy.setVelocity(0, 0)
        if (time >= Number(enemy.getData('warningAt'))) {
          enemy.setData('warning', false)
          const x = Number(enemy.getData('warningX'))
          const y = Number(enemy.getData('warningY'))
          const radius = Number(enemy.getData('warningRadius'))
          if (Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y) < radius) {
            this.damagePlayer(definition.damage, enemy)
          }
        }
      } else if (boss && distance < 380 && time >= Number(enemy.getData('attackAt')) &&
        (distance <= 90 || enemy.getData('nextPattern') === 'bolt')) {
        const bolt = enemy.getData('nextPattern') === 'bolt'
        const x = bolt ? this.player.x : enemy.x
        const y = bolt ? this.player.y : enemy.y
        const radius = bolt ? 55 : 112
        const delay = phaseTwo ? 500 : 750
        enemy.setVelocity(0, 0)
        enemy.setData('warning', true)
        enemy.setData('warningAt', time + delay)
        enemy.setData('warningX', x)
        enemy.setData('warningY', y)
        enemy.setData('warningRadius', radius)
        enemy.setData('nextPattern', bolt ? 'slam' : 'bolt')
        enemy.setData('attackAt', time + (phaseTwo ? 1600 : 2200))
        this.showToast(bolt ? 'The Guardian marks your position!' : 'The Guardian prepares a shockwave!')
        const warning = this.add.circle(x, y, radius, 0xd35454, 0.2).setStrokeStyle(3, 0xe88772).setDepth(1500)
        this.tweens.add({ targets: warning, alpha: 0.8, duration: delay, onComplete: () => warning.destroy() })
      } else if (distance < (boss ? 510 : 260)) {
        if (distance > (boss ? 90 : 37)) {
          const direction = new Phaser.Math.Vector2(this.player.x - enemy.x, this.player.y - enemy.y).normalize()
          const speed = definition.speed * (phaseTwo ? 1.45 : 1)
          enemy.setVelocity(direction.x * speed, direction.y * speed)
          enemy.setFlipX(direction.x < 0)
        } else {
          enemy.setVelocity(0, 0)
          if (time >= Number(enemy.getData('attackAt'))) {
            if (!boss) {
              enemy.setData('attackAt', time + 1250)
              this.damagePlayer(definition.damage, enemy)
            }
          }
        }
      } else {
        const originX = Number(enemy.getData('originX'))
        const targetX = originX + Math.sin(time / 1600 + originX) * 28
        const originY = Number(enemy.getData('originY'))
        const targetY = originY + Math.cos(time / 2100 + originY) * 18
        if (boss) enemy.setVelocity(0, 0)
        else enemy.setVelocity(Phaser.Math.Clamp(targetX - enemy.x, -20, 20), Phaser.Math.Clamp(targetY - enemy.y, -20, 20))
      }
      enemy.setDepth(enemy.y)
    }
  }

  private basicAttack(time: number): void {
    if (time - this.attackAt < 360) return
    this.attackAt = time
    this.audio.playTone(240, 0.09, 'sawtooth')
    this.performHit(48, this.saveData.player.attack + this.inventory.getAttackBonus(), 0.08)
  }

  private useSkill(time: number): void {
    if (time - this.skillAt < 1000 || this.saveData.player.mana < 10) return
    this.skillAt = time
    this.saveData.player.mana -= 10
    this.audio.playTone(520, 0.2, 'triangle')
    this.performHit(110, this.saveData.player.attack * 2 + this.inventory.getAttackBonus(), 0.38, true)
    this.showToast('Aether Pulse!')
    this.refreshHud()
  }

  private performHit(range: number, damage: number, effectAlpha: number, allAround = false): void {
    const point = new Phaser.Math.Vector2(this.player.x, this.player.y).add(this.facing.clone().scale(allAround ? 28 : 39))
    const slash = this.add.ellipse(point.x, point.y, allAround ? 120 : 42, allAround ? 120 : 24, 0xf3d894, effectAlpha)
      .setRotation(this.facing.angle()).setDepth(1500)
    this.tweens.add({ targets: slash, alpha: 0, scale: 1.35, duration: 200, onComplete: () => slash.destroy() })
    for (const enemy of [...this.enemies]) {
      if (!enemy.active) continue
      const targetDistance = Phaser.Math.Distance.Between(point.x, point.y, enemy.x, enemy.y)
      if (targetDistance > range || (!allAround && Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) > 105)) continue
      const remaining = Math.max(0, Number(enemy.getData('health')) - damage)
      enemy.setData('health', remaining)
      enemy.setTint(0xffffff)
      this.time.delayedCall(100, () => enemy.active && enemy.clearTint())
      const damageText = this.add.text(enemy.x, enemy.y - 20, `-${damage}`, { color: '#ffe6ad', fontSize: '18px', fontStyle: 'bold', stroke: '#39251d', strokeThickness: 3 }).setDepth(1600)
      this.tweens.add({ targets: damageText, y: damageText.y - 28, alpha: 0, duration: 600, onComplete: () => damageText.destroy() })
      if (remaining <= 0) this.defeatEnemy(enemy)
      else if (enemy.body) {
        const knockback = new Phaser.Math.Vector2(enemy.x - this.player.x, enemy.y - this.player.y).normalize().scale(95)
        enemy.setVelocity(knockback.x, knockback.y)
      }
    }
  }

  private defeatEnemy(enemy: Phaser.Physics.Arcade.Sprite): void {
    const kind = enemy.getData('kind') as string
    const definition = ENEMIES[kind]
    const isGuardian = kind === 'guardian'
    this.burst(enemy.x, enemy.y, isGuardian ? 0xb9a4f0 : 0xe7d59b, isGuardian ? 22 : 10)
    ;(enemy.getData('healthBar') as Phaser.GameObjects.Graphics | undefined)?.destroy()
    enemy.disableBody(true, true)
    this.enemies = this.enemies.filter((entry) => entry.active)
    this.saveData.player.gold += definition.gold
    const drops = rollDrops(definition.drops)
    drops.forEach((item) => this.inventory.add(item))
    const levels = ProgressionSystem.awardExperience(this.saveData.player, definition.experience)
    if (this.saveData.zone === 'forest' && !isGuardian) {
      this.saveData.quest.forestKills = Math.min(4, this.saveData.quest.forestKills + 1)
      if (this.saveData.quest.forestKills === 4) {
        const seal = this.zoneObjects.find((object) => object.active && object.getData('interactable') === 'sealed')
        seal?.setData('interactable', 'portal')
        seal?.setData('targetZone', 'dungeon')
        const label = this.zoneObjects.find((object) => object instanceof Phaser.GameObjects.Text && object.text === 'DUNGEON SEALED')
        if (label instanceof Phaser.GameObjects.Text) label.setText('ANCIENT DUNGEON')
      }
    }
    if (isGuardian) {
      this.audio.setZone('dungeon')
      this.saveData.quest.guardianDefeated = true
      this.createShard(enemy.x, enemy.y)
      this.showToast('The Guardian falls. Recover the shard!')
    } else {
      const loot = drops.length ? ` • Found ${drops.map((item) => ITEMS[item].name).join(', ')}` : ''
      this.showToast(`${definition.name} defeated! +${definition.experience} EXP${loot}`)
    }
    if (levels) {
      this.burst(this.player.x, this.player.y, 0xffdc83, 16)
      this.showToast(`Level up! You reached level ${this.saveData.player.level}.`)
    }
    this.audio.playTone(isGuardian ? 150 : 390, 0.28, 'triangle')
    this.refreshHud()
    this.saveGame(false)
  }

  private damagePlayer(amount: number, source: Phaser.Physics.Arcade.Sprite): void {
    if (this.time.now < this.damageAt) return
    this.damageAt = this.time.now + 650
    const damage = Math.max(1, amount - this.saveData.player.defense - this.inventory.getDefenseBonus())
    this.saveData.player.health = Math.max(0, this.saveData.player.health - damage)
    this.player.setTint(0xff7777)
    this.time.delayedCall(200, () => this.player.active && this.player.clearTint())
    const knockback = new Phaser.Math.Vector2(this.player.x - source.x, this.player.y - source.y).normalize().scale(140)
    this.player.setVelocity(knockback.x, knockback.y)
    this.audio.playTone(100, 0.16, 'square')
    this.showToast(`-${damage} health`)
    this.refreshHud()
    if (this.saveData.player.health <= 0) this.showGameOver()
  }

  private interact(time: number): void {
    if (time - this.interactionAt < 250) return
    this.interactionAt = time
    const candidates = this.children.list.filter(
      (child) => child.getData('interactable'),
    ) as Array<Phaser.GameObjects.GameObject & { x: number; y: number }>
    const target = candidates
      .filter((object) => object.getData('interactable'))
      .sort((a, b) => Phaser.Math.Distance.Between(this.player.x, this.player.y, a.x, a.y) -
        Phaser.Math.Distance.Between(this.player.x, this.player.y, b.x, b.y))[0]
    if (!target) {
      this.showToast('Nothing nearby to interact with.')
      return
    }
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y) > 100) {
      this.showToast('Move closer to interact.')
      return
    }

    const kind = target.getData('interactable') as string
    if (kind === 'elder') this.talkToElder()
    else if (kind === 'merchant') this.openMerchant()
    else if (kind === 'portal') this.usePortal(target)
    else if (kind === 'save') {
      this.saveGame()
    } else if (kind === 'sealed') this.showToast('The dungeon seal requires four corrupted creatures.')
    else if (kind === 'shard') this.recoverShard(target)
    else if (kind === 'chest') this.openChest(target)
  }

  private openChest(chest: Phaser.GameObjects.GameObject): void {
    if (chest.getData('opened')) {
      this.showToast('The chest is empty.')
      return
    }
    chest.setData('opened', true)
    this.saveData.forestChestOpened = true
    this.saveData.player.gold += 25
    this.inventory.add('health-potion')
    if (chest instanceof Phaser.GameObjects.Rectangle) chest.setFillStyle(0x6b655a)
    this.showToast('Treasure found: +25 gold and a Health Potion.')
    this.refreshHud()
    this.saveGame(false)
  }

  private talkToElder(): void {
    if (!this.saveData.quest.accepted) {
      this.saveData.quest.accepted = true
      this.saveData.quest.elderSpoken = true
      this.showDialogue([
        'Elder Rowan: The Aether Core has shattered, and its fragments have poisoned the forest.',
        'Find the corruption in Whispering Forest. Defeat four creatures, then seek the Ancient Dungeon.',
        'Bring the Aether fragment back to me. Greenleaf is counting on you.',
      ], 'Quest accepted: The Shattered Crystal')
      return
    }
    if (this.quest.isComplete()) {
      this.showDialogue(['Elder Rowan: The Core’s light lives on. Aetheria owes you a great debt.'], 'The Shattered Crystal — Complete')
      return
    }
    if (this.saveData.quest.shardRecovered) {
      this.saveData.quest.returnedToElder = true
      this.saveData.player.gold += 100
      const levels = ProgressionSystem.awardExperience(this.saveData.player, 120)
      this.showDialogue(
        ['Elder Rowan: You have returned with the shard! Its light will help us heal Aetheria.'],
        'Quest complete! +100 gold, +120 EXP',
        undefined,
        () => this.showVictory(),
      )
      if (levels) this.showToast(`Level up! You reached level ${this.saveData.player.level}.`)
      this.refreshHud()
      this.saveGame(false)
      return
    }
    this.showDialogue([`Elder Rowan: ${this.quest.getObjective()}`], 'The Shattered Crystal')
  }

  private openMerchant(): void {
    this.showDialogue(
      [`Mira: You have ${this.saveData.player.gold} gold. Choose an item to buy.`],
      'Merchant',
      [
        ['Health Potion — 18g', () => this.buyItem('health-potion')],
        ['Ether Potion — 22g', () => this.buyItem('ether-potion')],
        ['Iron Sword — 55g', () => this.buyItem('iron-sword')],
        ['Ranger Vest — 48g', () => this.buyItem('ranger-vest')],
      ],
    )
  }

  private buyItem(item: ItemId): void {
    const definition = ITEMS[item]
    if (this.saveData.player.gold < definition.price) {
      this.showToast('Not enough gold.')
      return
    }
    this.saveData.player.gold -= definition.price
    this.inventory.add(item)
    if (definition.category === 'weapon' || definition.category === 'armor') this.inventory.equip(item)
    this.audio.playTone(620, 0.1)
    this.showToast(`Purchased ${definition.name}.`)
    this.refreshHud()
    this.saveGame(false)
  }

  private usePortal(portal: Phaser.GameObjects.GameObject): void {
    const target = portal.getData('targetZone') as ZoneId
    if (target === 'dungeon' && this.saveData.quest.forestKills < 4) {
      this.showToast('The dungeon seal still resists the corruption.')
      return
    }
    if (target === 'dungeon') this.saveData.quest.dungeonFound = true
    const startX = target === 'village' || (target === 'forest' && this.saveData.zone === 'dungeon') ? 1000 : 120
    this.player.setPosition(startX, 360)
    this.saveData.zone = target
    this.enterZone(target)
    this.audio.playTone(340, 0.14, 'triangle')
    this.showToast(`Entered ${ZONE_NAMES[target]}.`)
  }

  private recoverShard(shard: Phaser.GameObjects.GameObject): void {
    this.saveData.quest.shardRecovered = true
    this.inventory.add('aether-shard')
    shard.destroy()
    this.showToast('Aether Shard recovered. Return to Elder Rowan.')
    this.audio.playTone(760, 0.35, 'sine')
    this.refreshHud()
    this.saveGame(false)
  }

  private showDialogue(lines: string[], title: string, choices?: Array<[string, () => void]>, onComplete?: () => void): void {
    this.closeDialogue()
    this.player.setVelocity(0, 0)
    this.physics.world.pause()
    this.dialogLines = lines
    this.dialogIndex = 0
    this.dialogueComplete = onComplete
    const panel = this.add.container(480, 420).setScrollFactor(0).setDepth(2300)
    this.dialoguePanel = panel
    panel.add(this.add.rectangle(0, 0, 780, choices ? 206 : 142, 0x111b17, 0.97).setStrokeStyle(3, 0xb9965a))
    panel.add(this.add.text(-365, choices ? -88 : -56, title, { color: '#f3d894', fontSize: '17px', fontStyle: 'bold' }))
    this.dialogText = this.add.text(-365, choices ? -56 : -24, lines[0], {
      color: '#eee8d7',
      fontSize: '15px',
      wordWrap: { width: choices ? 720 : 720 },
      lineSpacing: 4,
    })
    panel.add(this.dialogText)
    if (choices) {
      choices.forEach(([label, action], index) => {
        const button = this.add.text(-355 + (index % 2) * 355, 14 + Math.floor(index / 2) * 40, label, {
          color: '#fff1c8',
          backgroundColor: '#705331',
          fontSize: '13px',
          padding: { x: 8, y: 6 },
        }).setScrollFactor(0).setInteractive({ useHandCursor: true })
        this.onUiPointerDown(button, () => {
          action()
          this.closeDialogue()
        })
        panel.add(button)
      })
    } else {
      const next = this.add.text(355, 34, 'NEXT  [E / ENTER]', {
        color: '#fff1c8', backgroundColor: '#705331', fontSize: '14px', padding: { x: 12, y: 10 },
      }).setOrigin(1, 0).setScrollFactor(0).setInteractive({ useHandCursor: true })
      this.onUiPointerDown(next, () => this.advanceDialogue())
      panel.add(next)
    }
    if (choices) {
      const close = this.add.text(365, -88, 'CLOSE', {
        color: '#fff1c8', backgroundColor: '#705331', fontSize: '14px', padding: { x: 8, y: 6 },
      }).setOrigin(1, 0).setScrollFactor(0).setInteractive({ useHandCursor: true })
      this.onUiPointerDown(close, () => this.closeDialogue())
      panel.add(close)
    }
  }

  private advanceDialogue(): void {
    if (!this.dialoguePanel) return
    this.dialogIndex += 1
    if (this.dialogIndex >= this.dialogLines.length) {
      const onComplete = this.dialogueComplete
      this.closeDialogue()
      this.refreshHud()
      onComplete?.()
      return
    }
    this.dialogText?.setText(this.dialogLines[this.dialogIndex])
  }

  private closeDialogue(): void {
    this.dialoguePanel?.destroy()
    this.dialoguePanel = undefined
    this.dialogText = undefined
    this.dialogueComplete = undefined
    if (!this.paused) this.physics.world.resume()
  }

  private toggleInventory(): void {
    if (this.pausedPanel) return
    if (this.inventoryPanel) {
      this.inventoryPanel.destroy()
      this.inventoryPanel = undefined
      this.paused = false
      this.physics.world.resume()
      return
    }
    if (this.dialoguePanel || this.paused) return
    this.paused = true
    this.player.setVelocity(0, 0)
    this.physics.world.pause()
    const panel = this.add.container(480, 270).setScrollFactor(0).setDepth(2400)
    this.inventoryPanel = panel
    panel.add(this.add.rectangle(0, 0, 700, 420, 0x111b17, 0.98).setStrokeStyle(3, 0xb9965a))
    panel.add(this.add.text(-320, -185, 'INVENTORY & CHARACTER', { color: '#f3d894', fontSize: '22px', fontStyle: 'bold' }))
    panel.add(this.add.text(-320, -150, `Level ${this.saveData.player.level}   ATK ${this.saveData.player.attack + this.inventory.getAttackBonus()}   DEF ${this.saveData.player.defense + this.inventory.getDefenseBonus()}   Gold ${this.saveData.player.gold}`, { color: '#eee8d7', fontSize: '15px' }))
    const equipped = (['weapon', 'armor'] as const)
    equipped.forEach((slot, index) => {
      const id = this.saveData.equipment[slot]
      const label = this.add.text(-315 + index * 320, 112, `${slot.toUpperCase()}: ${id ? ITEMS[id].name : 'None'}`, {
        color: '#f3d894', backgroundColor: '#293b31', fontSize: '14px', padding: { x: 8, y: 8 },
      }).setScrollFactor(0).setInteractive({ useHandCursor: true })
      this.onUiPointerDown(label, () => {
        if (id && this.inventory.unequip(slot)) {
          this.showToast(`${ITEMS[id].name} unequipped.`)
          this.refreshHud()
          this.toggleInventory()
          this.toggleInventory()
        }
      })
      panel.add(label)
    })
    const slots = Object.entries(this.saveData.inventory) as Array<[ItemId, number]>
    if (!slots.length) panel.add(this.add.text(-315, -100, 'Your pack is empty.', { color: '#c4cec4', fontSize: '16px' }))
    slots.forEach(([id, count], index) => {
      const item = ITEMS[id]
      const row = this.add.text(-315, -112 + index * 44, `${item.name}  x${count}    — ${item.description}`, {
        color: '#e9e3d3',
        backgroundColor: index % 2 ? '#202e27' : '#293b31',
        fontSize: '14px',
        padding: { x: 8, y: 6 },
        fixedWidth: 620,
      }).setScrollFactor(0).setInteractive({ useHandCursor: true })
      this.onUiPointerDown(row, () => {
        if (item.category === 'weapon' || item.category === 'armor') {
          this.inventory.equip(id)
          this.showToast(`${item.name} equipped.`)
        } else if (item.category === 'consumable') {
          if (this.inventory.consume(id)) this.showToast(`${item.name} used.`)
          else this.showToast('That item cannot be used right now.')
        }
        this.refreshHud()
        this.inventoryPanel?.destroy()
        this.inventoryPanel = undefined
        this.paused = false
        this.physics.world.resume()
      })
      panel.add(row)
    })
    const close = this.add.text(246, 172, 'CLOSE  [I]', { color: '#fff1c8', backgroundColor: '#705331', fontSize: '15px', padding: { x: 12, y: 7 } }).setScrollFactor(0).setInteractive({ useHandCursor: true })
    this.onUiPointerDown(close, () => this.toggleInventory())
    panel.add(close)
  }

  private togglePause(): void {
    if (this.endPanel) return
    if (this.dialoguePanel) {
      this.advanceDialogue()
      return
    }
    if (this.inventoryPanel) {
      this.toggleInventory()
      return
    }
    this.paused = !this.paused
    if (this.paused) {
      this.player.setVelocity(0, 0)
      this.physics.world.pause()
      const panel = this.add.container(480, 270).setScrollFactor(0).setDepth(2500)
      this.pausedPanel = panel
      panel.add(this.add.rectangle(0, 0, 360, 190, 0x111b17, 0.97).setStrokeStyle(3, 0xb9965a))
      panel.add(this.add.text(0, -54, 'PAUSED', { color: '#f3d894', fontSize: '26px', fontStyle: 'bold' }).setOrigin(0.5))
      const resume = this.add.text(0, 4, 'RESUME', { color: '#fff1c8', backgroundColor: '#705331', fontSize: '17px', padding: { x: 18, y: 9 } }).setOrigin(0.5).setScrollFactor(0).setInteractive()
      this.onUiPointerDown(resume, () => this.togglePause())
      const audio = this.add.text(0, 58, `AUDIO: ${this.audio.isMuted() ? 'OFF' : 'ON'}`, { color: '#ddd6c5', fontSize: '15px' }).setOrigin(0.5).setScrollFactor(0).setInteractive()
      this.onUiPointerDown(audio, () => {
        this.saveData.muted = this.audio.toggleMute()
        audio.setText(`AUDIO: ${this.audio.isMuted() ? 'OFF' : 'ON'}`)
        if (!SaveSystem.setMuted(this.saveData.muted)) this.showToast('Unable to save audio settings.')
        this.saveGame(false)
      })
      panel.add([resume, audio])
    } else {
      this.pausedPanel?.destroy()
      this.pausedPanel = undefined
      this.physics.world.resume()
    }
  }

  private showGameOver(): void {
    this.paused = true
    this.physics.world.pause()
    const panel = this.add.container(480, 270).setScrollFactor(0).setDepth(2600)
    this.endPanel = panel
    panel.add(this.add.rectangle(0, 0, 400, 220, 0x111b17, 0.97).setStrokeStyle(3, 0xb9965a))
    panel.add(this.add.text(0, -65, 'YOU HAVE FALLEN', { color: '#e99b83', fontSize: '24px', fontStyle: 'bold' }).setOrigin(0.5))
    const revive = this.add.text(0, 6, 'RISE AGAIN', { color: '#fff1c8', backgroundColor: '#705331', fontSize: '17px', padding: { x: 18, y: 9 } }).setOrigin(0.5).setScrollFactor(0).setInteractive()
    this.onUiPointerDown(revive, () => {
      this.saveData.player.health = Math.ceil(this.saveData.player.maxHealth / 2)
      this.saveData.zone = 'village'
      this.saveData.x = 470
      this.saveData.y = 360
      this.scene.restart({ save: this.saveData })
    })
    panel.add(revive)
    panel.add(this.add.text(0, 70, 'Your progress is safe. Return to the village.', { color: '#ddd6c5', fontSize: '14px' }).setOrigin(0.5))
  }

  private showVictory(): void {
    this.paused = true
    this.physics.world.pause()
    const panel = this.add.container(480, 270).setScrollFactor(0).setDepth(2600)
    this.endPanel = panel
    panel.add(this.add.rectangle(0, 0, 560, 260, 0x111b17, 0.97).setStrokeStyle(3, 0xb9965a))
    panel.add(this.add.text(0, -88, 'THE SHATTERED CRYSTAL', {
      color: '#f3d894', fontFamily: 'Georgia', fontSize: '24px', fontStyle: 'bold',
    }).setOrigin(0.5))
    panel.add(this.add.text(0, -35, 'The first echo is restored. Aetheria has hope again.', {
      color: '#e5e9d8', fontSize: '16px',
    }).setOrigin(0.5))
    const resume = this.add.text(0, 48, 'CONTINUE EXPLORING', {
      color: '#fff1c8', backgroundColor: '#705331', fontSize: '16px', padding: { x: 18, y: 10 },
    }).setOrigin(0.5).setScrollFactor(0).setInteractive({ useHandCursor: true })
    this.onUiPointerDown(resume, () => {
      panel.destroy()
      this.endPanel = undefined
      this.paused = false
      this.physics.world.resume()
    })
    panel.add(resume)
  }

  private usePotion(): void {
    const health = this.saveData.player.health < this.saveData.player.maxHealth
    const potion: ItemId = health ? 'health-potion' : 'ether-potion'
    if (this.inventory.consume(potion)) {
      this.audio.playTone(680, 0.12, 'sine')
      this.showToast(`${ITEMS[potion].name} used.`)
      this.refreshHud()
    } else {
      this.showToast(`No usable ${ITEMS[potion].name.toLowerCase()} available.`)
    }
  }

  private saveGame(showMessage = true): void {
    this.saveData.x = this.player.x
    this.saveData.y = this.player.y
    this.saveData.muted = this.audio.isMuted()
    const saved = SaveSystem.save(this.saveData)
    if (!saved) this.showToast('Unable to save game. Check storage permissions.')
    else if (showMessage) this.showToast('Game saved.')
  }

  private refreshHud(): void {
    const player = this.saveData.player
    const xpNext = ProgressionSystem.experienceToNext(player.level)
    this.hudText.setText(`LV ${player.level}   HP ${player.health}/${player.maxHealth}   MP ${player.mana}/${player.maxMana}   EXP ${player.experience}/${xpNext}   GOLD ${player.gold}   POTIONS ${this.inventory.count('health-potion')}`)
    this.objectiveText.setText(`THE SHATTERED CRYSTAL  •  ${this.quest.getObjective()}`)
    this.refreshBars()
  }

  private refreshBars(): void {
    if (!this.healthBar || !this.manaBar) return
    this.healthBar.clear()
    this.healthBar.fillStyle(0x34221e, 1).fillRoundedRect(28, 51, 310, 9, 4)
    this.healthBar.fillStyle(0xb94f4d, 1).fillRoundedRect(28, 51, 310 * this.saveData.player.health / this.saveData.player.maxHealth, 9, 4)
    this.manaBar.clear()
    this.manaBar.fillStyle(0x222938, 1).fillRoundedRect(28, 64, 310, 7, 3)
    this.manaBar.fillStyle(0x648bd0, 1).fillRoundedRect(28, 64, 310 * this.saveData.player.mana / this.saveData.player.maxMana, 7, 3)
    this.experienceBar.clear()
    this.experienceBar.fillStyle(0x3e3722, 1).fillRoundedRect(345, 51, 230, 9, 4)
    this.experienceBar.fillStyle(0xd0af59, 1).fillRoundedRect(
      345, 51, 230 * this.saveData.player.experience / ProgressionSystem.experienceToNext(this.saveData.player.level), 9, 4,
    )
  }

  private showToast(message: string): void {
    this.toastText.setText(message).setVisible(true)
    this.toastUntil = this.time.now + 2200
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.dialoguePanel || this.inventoryPanel || this.paused) return
    const action = this.input.hitTestPointer(pointer).find((object) => object.getData('action'))?.getData('action')
    if (action) {
      if (action === 'attack') this.touchAttack = true
      if (action === 'interact') this.touchInteract = true
      if (action === 'potion') this.touchPotion = true
      if (action === 'skill') this.touchSkill = true
      return
    }
    if (pointer.x < 190 && pointer.y > 320 && this.joystickPointer < 0) {
      this.joystickPointer = pointer.id
      this.joystickOrigin.set(pointer.x, pointer.y)
      this.updateJoystick(pointer)
    }
  }

  private onUiPointerDown(object: Phaser.GameObjects.GameObject, action: () => void): void {
    object.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation()
      action()
    })
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id === this.joystickPointer) this.updateJoystick(pointer)
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id === this.joystickPointer) {
      this.joystickPointer = -1
      this.joystickVector.set(0, 0)
      this.joystickKnob.setPosition(100, 431)
    }
  }

  private updateJoystick(pointer: Phaser.Input.Pointer): void {
    const delta = new Phaser.Math.Vector2(pointer.x - this.joystickOrigin.x, pointer.y - this.joystickOrigin.y)
    if (delta.length() > 46) delta.setLength(46)
    this.joystickVector.copy(delta).scale(1 / 46)
    this.joystickKnob.setPosition(100 + delta.x, 431 + delta.y)
  }

  private burst(x: number, y: number, tint: number, quantity: number): void {
    const particles = this.add.particles(x, y, 'spark', {
      speed: { min: 30, max: 120 },
      lifespan: 500,
      scale: { start: 1.5, end: 0 },
      alpha: { start: 1, end: 0 },
      tint,
      emitting: false,
    }).setDepth(1500)
    particles.explode(quantity)
    this.time.delayedCall(600, () => particles.destroy())
  }

  private onShutdown(): void {
    this.input.off('pointerdown', this.onPointerDown, this)
    this.input.off('pointermove', this.onPointerMove, this)
    this.input.off('pointerup', this.onPointerUp, this)
    this.input.off('pointerupoutside', this.onPointerUp, this)
    this.input.keyboard?.off('keydown-ESC', this.togglePause, this)
    this.input.keyboard?.off('keydown-ENTER', this.advanceDialogue, this)
    this.input.keyboard?.off('keydown-I', this.toggleInventory, this)
    this.audio.dispose()
    this.terrainMap?.destroy()
    this.terrainMap = undefined
  }

  private track<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.zoneObjects.push(object)
    return object
  }

}
