import type { QuestState } from '../data/gameData'

export class QuestSystem {
  constructor(private readonly state: QuestState) {}

  getObjective(): string {
    if (!this.state.accepted) return 'Speak to the village elder.'
    if (!this.state.elderSpoken) return 'Return to the village elder.'
    if (this.state.forestKills < 4) return `Defeat corrupted monsters (${this.state.forestKills}/4).`
    if (!this.state.dungeonFound) return 'Find the entrance to the Ancient Dungeon.'
    if (!this.state.guardianDefeated) return 'Defeat the Corrupted Guardian.'
    if (!this.state.shardRecovered) return 'Recover the Aether fragment from the guardian.'
    if (!this.state.returnedToElder) return 'Return to the village elder.'
    return 'The Shattered Crystal — Complete!'
  }

  isComplete(): boolean {
    return this.state.returnedToElder
  }
}
