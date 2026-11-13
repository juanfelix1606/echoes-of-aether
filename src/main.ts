import Phaser from 'phaser'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { gameConfig } from './config/gameConfig'
import { GameScene } from './scenes/GameScene'
import './style.css'

export const game = new Phaser.Game(gameConfig)

if (Capacitor.getPlatform() === 'android') {
  void App.addListener('backButton', () => {
    const scene = game.scene.getScene('GameScene')
    if (scene instanceof GameScene && scene.scene.isActive()) {
      scene.handleBack()
    } else {
      void App.exitApp().catch((error: unknown) => console.error('Unable to exit the app.', error))
    }
  }).catch((error: unknown) => console.error('Unable to register Android back button.', error))

  void App.addListener('pause', () => {
    const scene = game.scene.getScene('GameScene')
    if (scene instanceof GameScene && scene.scene.isActive()) scene.saveOnBackground()
  }).catch((error: unknown) => console.error('Unable to register Android pause handler.', error))
}
