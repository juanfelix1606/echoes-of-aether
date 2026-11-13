import type { PlayerStats } from '../data/gameData'

export class ProgressionSystem {
  static experienceToNext(level: number): number {
    return 40 + level * 35
  }

  static awardExperience(player: PlayerStats, amount: number): number {
    let levelsGained = 0
    player.experience += amount

    while (player.experience >= this.experienceToNext(player.level)) {
      player.experience -= this.experienceToNext(player.level)
      player.level += 1
      player.maxHealth += 15
      player.maxMana += 5
      player.attack += 2
      player.defense += 1
      player.health = player.maxHealth
      player.mana = player.maxMana
      levelsGained += 1
    }

    return levelsGained
  }
}
