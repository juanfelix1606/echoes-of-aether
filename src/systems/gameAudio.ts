import { AudioSystem } from './AudioSystem'
import { SaveSystem } from './SaveSystem'

export const gameAudio = new AudioSystem(SaveSystem.load()?.muted ?? SaveSystem.fresh().muted)
