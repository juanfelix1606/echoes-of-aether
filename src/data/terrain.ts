import Phaser from 'phaser'
import type { ZoneId } from './gameData'

const palettes: Record<ZoneId, [number, number, number]> = {
  village: [0x537955, 0x658b5f, 0x405f49],
  forest: [0x315640, 0x477556, 0x254437],
  dungeon: [0x373a49, 0x4c5060, 0x282b38],
}

export function getBlockingTiles(zone: ZoneId): Array<[number, number]> {
  if (zone === 'village') return [[5, 9], [5, 10], [30, 9], [30, 10]]
  if (zone === 'forest') return [[11, 5], [12, 5], [11, 6], [22, 14], [23, 14], [23, 15]]
  return [6, 7, 8, 13, 14, 15].flatMap((y): Array<[number, number]> => [[21, y], [22, y]])
}

export function createTerrain(scene: Phaser.Scene, zone: ZoneId, width: number, height: number): {
  map: Phaser.Tilemaps.Tilemap
  blocking: Phaser.Tilemaps.TilemapLayer
} {
  const key = `terrain-${zone}`
  if (!scene.textures.exists(key)) {
    const graphics = scene.make.graphics({ x: 0, y: 0 })
    const [ground, light, shadow] = palettes[zone]
    for (let tile = 0; tile < 4; tile += 1) {
      const x = tile * 32
      graphics.fillStyle(ground).fillRect(x, 0, 32, 32)
      if (zone === 'dungeon') {
        graphics.lineStyle(1, shadow, 0.65).strokeRect(x, 0, 32, 32)
        graphics.fillStyle(light, 0.7).fillRect(x + 2, 2, 25, 1)
        graphics.fillStyle(shadow, 0.6).fillRect(x + 5 + tile * 3, 10, 9, 1).fillRect(x + 18, 19, 1, 5)
        if (tile === 3) graphics.fillStyle(0x89969b, 0.5).fillRect(x + 14, 14, 3, 3)
      } else {
        graphics.fillStyle(light, 0.55)
          .fillRect(x + 5 + tile * 3, 9, 1, 4)
          .fillRect(x + 9 + tile * 3, 11, 1, 3)
          .fillRect(x + 20 - tile * 2, 24, 1, 4)
        graphics.fillStyle(shadow, 0.35).fillRect(x + 2, 29, 10, 1).fillRect(x + 23, 3, 6, 1)
        if (tile === 3) graphics.fillStyle(zone === 'village' ? 0xf0cd91 : 0x9ac4a3).fillRect(x + 15, 15, 2, 2)
      }
    }
    graphics.fillStyle(shadow).fillRect(128, 0, 32, 32)
    graphics.fillStyle(light, 0.8).fillRect(130, 2, 28, 4)
    graphics.lineStyle(2, ground).strokeRect(130, 7, 28, 23)
    graphics.lineStyle(1, shadow).lineBetween(144, 8, 144, 29)
    graphics.generateTexture(key, 160, 32)
    graphics.destroy()
  }

  const columns = Math.ceil(width / 32)
  const rows = Math.ceil(height / 32)
  const data = Array.from({ length: rows }, (_, y) =>
    Array.from({ length: columns }, (_, x) => (x * 13 + y * 7 + (x * y) % 5) % 4),
  )
  const map = scene.make.tilemap({ data, tileWidth: 32, tileHeight: 32 })
  const tiles = map.addTilesetImage('terrain', key, 32, 32, 0, 0, 0)
  if (!tiles) throw new Error(`Could not create terrain tileset for ${zone}`)
  const layer = map.createLayer(0, tiles, 0, 0)
  if (!layer) throw new Error(`Could not create terrain layer for ${zone}`)
  layer.setDepth(-999)
  const blocking = map.createBlankLayer('blocking', tiles)
  if (!blocking) throw new Error(`Could not create blocking layer for ${zone}`)
  for (const [x, y] of getBlockingTiles(zone)) blocking.putTileAt(4, x, y)
  blocking.setCollision(4).setDepth(0)
  return { map, blocking }
}
