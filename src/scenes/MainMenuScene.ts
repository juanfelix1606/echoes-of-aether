import Phaser from 'phaser'
import { SaveSystem } from '../systems/SaveSystem'
import { gameAudio } from '../systems/gameAudio'

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenuScene')
  }

  create(): void {
    const { width, height } = this.scale
    const centerX = width / 2
    const centerY = height / 2
    const hasSave = SaveSystem.hasSave()

    this.add.rectangle(centerX, centerY, width, height, 0x18241f)
    const backdrop = this.add.graphics()
    backdrop.fillStyle(0x263e34, 0.6)
    for (let x = 25; x < width; x += 65) {
      const heightOffset = (x * 7) % 70
      backdrop.fillTriangle(x - 50, height, x, height - 90 - heightOffset, x + 50, height)
    }
    backdrop.fillStyle(0xc3b87c, 0.55)
    for (let i = 0; i < 32; i += 1) {
      backdrop.fillRect((i * 193 + 29) % width, (i * 71 + 28) % (height - 150), 2, 2)
    }
    this.add.rectangle(centerX, centerY - 5, 600, 390, 0x263a32)
    this.add.rectangle(centerX, centerY - 5, 588, 378, 0x1d2c26)

    this.add
      .text(centerX, centerY - 155, 'ECHOES OF AETHER', {
        color: '#f3d894',
        fontFamily: 'Georgia, serif',
        fontSize: '38px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)

    this.add
      .text(centerX, centerY - 112, 'The Shattered Crystal', {
        color: '#b8c5b7',
        fontFamily: 'Georgia, serif',
        fontSize: '18px',
      })
      .setOrigin(0.5)

    const newGame = () => this.scene.start('GameScene', { save: SaveSystem.fresh() })
    const continueGame = () => {
      const save = SaveSystem.load()
      if (save) this.scene.start('GameScene', { save })
      else this.showNotice('No valid save found. Start a new game.')
    }
    this.createButton(centerX, centerY - 55, '1  NEW GAME', newGame)
    this.createButton(centerX, centerY + 3, '2  CONTINUE', continueGame, !hasSave)
    this.createButton(centerX, centerY + 61, '3  SETTINGS: AUDIO', () => this.toggleAudioSetting())
    this.createButton(centerX, centerY + 119, '4  CREDITS', () => this.showCredits())

    this.add
      .text(centerX, centerY + 181, 'WASD / ARROWS: MOVE     SPACE: ATTACK     E: INTERACT', {
        color: '#c4cec4',
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
      })
      .setOrigin(0.5)

    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return
      if (event.key === 'Enter' || event.key === '1') newGame()
      else if (event.key === '2') continueGame()
      else if (event.key === '3') this.toggleAudioSetting()
      else if (event.key === '4') this.showCredits()
    }
    this.input.keyboard?.on('keydown', onKey)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.off('keydown', onKey))
  }

  private createButton(x: number, y: number, label: string, action: () => void, disabled = false): void {
    const button = this.add
      .text(x, y, label, {
        backgroundColor: disabled ? '#41483e' : '#7d6033',
        color: disabled ? '#a4a69a' : '#fff1c8',
        fontFamily: 'Georgia, serif',
        fontSize: '18px',
        fontStyle: 'bold',
        padding: { x: 28, y: 9 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: !disabled })
    if (!disabled) {
      button.on('pointerover', () => button.setStyle({ backgroundColor: '#9a7741' }))
      button.on('pointerout', () => button.setStyle({ backgroundColor: '#7d6033' }))
      button.on('pointerdown', action)
    }
  }

  private toggleAudioSetting(): void {
    const saved = SaveSystem.load()
    const muted = !(saved?.muted ?? SaveSystem.fresh().muted)
    gameAudio.setMuted(muted)
    if (!muted) gameAudio.playTone(523.25, 0.15, 'triangle', 0.08)
    const settingsSaved = SaveSystem.setMuted(muted)
    const progressSaved = saved ? SaveSystem.save({ ...saved, muted }) : true
    this.showNotice(settingsSaved && progressSaved ? `Audio ${muted ? 'muted' : 'enabled'}.` : 'Unable to save audio settings.')
  }

  private showCredits(): void {
    this.showNotice('Aetheria, its characters, pixel art and music are generated in-game for this project foundation.')
  }

  private showNotice(message: string): void {
    const notice = this.add
      .text(this.scale.width / 2, this.scale.height - 18, message, {
        color: '#fff1c8',
        backgroundColor: '#142019',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        padding: { x: 12, y: 7 },
        wordWrap: { width: 650 },
      })
      .setOrigin(0.5, 1)
      .setDepth(10)
    this.time.delayedCall(2800, () => notice.destroy())
  }
}
