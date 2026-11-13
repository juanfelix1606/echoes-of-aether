import Phaser from 'phaser'

type PixelArt = { rows: string[]; colors: Record<string, number>; scale: number }

const art: Record<string, PixelArt> = {
  hero: {
    scale: 2,
    colors: { o: 0x252332, h: 0x634938, H: 0x9b7350, s: 0xe7bd90, f: 0xb67e62, c: 0x4c376b, C: 0x8968aa, g: 0xe3bf6b, b: 0x533b34, w: 0xf6e4c5 },
    rows: [
      '.....oooooo.....', '....ohhhhHho....', '...ohhHHhhhho...', '...ohssssssho...',
      '...ofsoossofo...', '...ofssssssfo...', '....ofssssfo....', '.....offffo.....',
      '....ocggggco....', '...ocCCCCCCco...', '..ocCCgCCgCCco..', '..osCCgCCgCCso..',
      '..osCCggggCCso..', '...oCCbbbbCCo...', '....obCCCCbo....', '....obboobbo....',
      '....obboobbo....', '....owwoowwo....', '....oooo.oooo...',
    ],
  },
  elder: {
    scale: 2,
    colors: { o: 0x262b38, w: 0xe8e5d4, W: 0xffffff, s: 0xd8ad86, d: 0x626b8a, D: 0x929ec0, g: 0xd0b46a, b: 0x594a40 },
    rows: [
      '.....oooooo.....', '....owWWWWwo....', '...owwWWWWwwo...', '...owsssssswo...',
      '...owsossoswo...', '...owsssssswo...', '....owwwwwwwo...', '....owwWWwwo....',
      '....odggggdo....', '...odDDDDDDdo...', '..odDDgDDgDDdo..', '..osDDgDDgDDso..',
      '..osDDggggDDso..', '...odDDDDDDdo...', '....odDDDDdo....', '....oddoobbo....',
      '....oddoobbo....', '....oooo.oooo...',
    ],
  },
  merchant: {
    scale: 2,
    colors: { o: 0x302a31, h: 0x5c3c2c, s: 0xdbac7e, r: 0x8c3d42, R: 0xc36a5b, g: 0xe9c579, b: 0x604634, w: 0xf2dab7 },
    rows: [
      '....ooooooo.....', '...ogggrgggo....', '..oggggrggggo...', '...ohhhhhhho....',
      '...ohsssssso....', '...ohsoossoho...', '....osssssso....', '.....osssso.....',
      '....orggggro....', '...orRRRRRRro...', '..orRRgRRgRRro..', '..osRRgRRgRRso..',
      '..osRRggggRRso..', '...orRRbbRRro...', '....obbbbbbo....', '....obboobbo....',
      '....obboobbo....', '....owwoowwo....', '....oooo.oooo...',
    ],
  },
  slime: {
    scale: 2,
    colors: { o: 0x1c493b, g: 0x4ba96e, G: 0x7edb8e, l: 0xb5f2ae, e: 0x213c37, w: 0xf5edbd },
    rows: [
      '......oooo......', '....oogGGGoo....', '...ogGGllGGgo...', '..ogGGllllGGgo..',
      '.ogGGGGGGGGGGgo.', '.ogGGeGGeGGGGgo.', 'ogGGGwGGwGGGGGgo', 'ogGGGGGGGGGGGGgo',
      'ogggGGGGGGGGgggo', '.ooggggggggggoo.', '...oooooooooo...',
    ],
  },
  goblin: {
    scale: 2,
    colors: { o: 0x26382c, g: 0x6e984e, G: 0x9abd64, s: 0xd8c382, r: 0x984f44, b: 0x735039, w: 0xe9d7a4 },
    rows: [
      '....ooooooo.....', '..ooggGGgggoo...', '.ogggGGGGggggo..', 'oogGGoGGGoGGgoo.',
      'ogggGoooGGggggo.', '.ogGGGGGGGGGgo..', '..ogGGssGGGgo...', '...ogggggggo....',
      '...obrrrrrbo....', '..obrrsrrsrbo...', '.ogbrsrsrsrbgo..', '.ogbrsrrrsrbgo..',
      '..obrrrrrrrbo...', '...obbbbbbo.....', '...obboobbo.....', '...obboobbo.....',
      '...owwoowwo.....', '...oooo.oooo....',
    ],
  },
  skeleton: {
    scale: 2,
    colors: { o: 0x393744, w: 0xddd8bb, W: 0xf6f0d7, s: 0xaaa593, b: 0x6c645d, r: 0x985e55 },
    rows: [
      '....ooooooo.....', '...owWWWWWwo....', '..owWWWWWWWwo...', '..owWooowWWwo...',
      '..owsosowoswo...', '..owWsssWWwwo...', '...owWoWWwo.....', '....owwwwwo.....',
      '...obrrrrrbo....', '..obwWwWwWwbo...', '.obowwWwWwwobo..',
      '.osowwwwwwwoso..', '..ooowbwbwooo...', '....owbwbwo.....', '....ossoosso....',
      '....ossoosso....', '....owwoowwo....', '....oooo.oooo...',
    ],
  },
  guardian: {
    scale: 4,
    colors: { o: 0x252032, p: 0x65577c, P: 0x9482ae, g: 0xc9a967, c: 0x7cddd1, w: 0xece0bd, r: 0xbc667b },
    rows: [
      '.oo.........oo..', '.opo..ooo..opo..', '..opooPPoopoo...',
      '...opPPPPPo.....', '..opPccPccPo....', '..opPooPooPo....', '..opPPPPPPPo....',
      '...opggggpo.....', '..opPPggPPpo....', '.opPPgPPgPPpo...', 'opPPgPccPgPPpo..',
      'opPPgPccPgPPpo..', '.opPPggggPPpo...', '..opPPPPPPpo....', '..opppoopppo....',
      '..opppoopppo....', '..owwwoowwwo....', '..oooo..oooo....',
    ],
  },
  tree: {
    scale: 2,
    colors: { o: 0x203c2e, d: 0x2d5940, g: 0x407850, G: 0x60945d, l: 0x83a96b, b: 0x604535, B: 0x8e6947 },
    rows: [
      '.........oooooo.........', '.......ooddGGddoo.......', '......odGGGllGGGdo......',
      '....oodGGGllllGGGdoo....', '...odGGllGGGGGGllGGdo...',
      '..odGGGGGGGddGGGGGGGdo..', '.odGGlGGGddddGGGlGGGGdo.',
      '.odGGGGGddGGddGGGGGGGdo.', 'odGGGGGddGGGGddGGGGGGGdo',
      'odGGGGGdGGGGGGdGGGGGGGdo', '.odGGGGGGGGGGGGGGGGGGdo.',
      '..oodGGGGGGGGGGGGGGdoo..', '....oodddGGGGGdddoo.....',
      '.......ooobBBbooo.......', '..........bBBb..........',
      '.........obBBbo.........', '........obbbbbbo........', '........oooooooo........',
    ],
  },
}

export function generateTextures(scene: Phaser.Scene): void {
  for (const [key, { rows, colors, scale }] of Object.entries(art)) {
    if (scene.textures.exists(key)) continue
    const graphics = scene.make.graphics({ x: 0, y: 0 })
    for (let y = 0; y < rows.length; y += 1) {
      for (let x = 0; x < rows[y].length; x += 1) {
        const color = colors[rows[y][x]]
        if (color !== undefined) graphics.fillStyle(color).fillRect(x * scale, y * scale, scale, scale)
      }
    }
    graphics.generateTexture(key, Math.max(...rows.map((row) => row.length)) * scale, rows.length * scale)
    graphics.destroy()
  }
  if (!scene.textures.exists('spark')) {
    const spark = scene.make.graphics({ x: 0, y: 0 })
    spark.fillStyle(0xffffff).fillRect(1, 0, 2, 4).fillRect(0, 1, 4, 2)
    spark.generateTexture('spark', 4, 4)
    spark.destroy()
  }
}
