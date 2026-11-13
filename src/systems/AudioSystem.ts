import type { ZoneId } from '../data/gameData'

export class AudioSystem {
  private context?: AudioContext
  private musicTimer?: number
  private musicStep = 0

  constructor(private muted: boolean) {}

  isMuted(): boolean {
    return this.muted
  }

  toggleMute(): boolean {
    this.muted = !this.muted
    return this.muted
  }

  setZone(zone: ZoneId): void {
    if (this.musicTimer !== undefined) window.clearInterval(this.musicTimer)
    const melody: Record<ZoneId, number[]> = {
      village: [261.63, 329.63, 392, 329.63, 293.66, 349.23],
      forest: [196, 233.08, 293.66, 261.63, 220, 261.63],
      dungeon: [146.83, 174.61, 220, 196, 164.81, 196],
    }
    this.musicStep = 0
    this.musicTimer = window.setInterval(() => {
      const note = melody[zone][this.musicStep % melody[zone].length]
      this.musicStep += 1
      this.playTone(note, zone === 'dungeon' ? 0.6 : 0.42, 'sine')
    }, zone === 'dungeon' ? 1650 : 2100)
  }

  dispose(): void {
    if (this.musicTimer !== undefined) window.clearInterval(this.musicTimer)
    this.musicTimer = undefined
    if (this.context) {
      void this.context.close().catch((error: unknown) => console.warn('Unable to close game audio.', error))
      this.context = undefined
    }
  }

  playTone(frequency: number, duration = 0.1, waveform: OscillatorType = 'sine'): void {
    if (this.muted) return

    try {
      this.context ??= new AudioContext()
      if (this.context.state === 'suspended') void this.context.resume()
      const oscillator = this.context.createOscillator()
      const gain = this.context.createGain()
      oscillator.type = waveform
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.06, this.context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + duration)
      oscillator.connect(gain)
      gain.connect(this.context.destination)
      oscillator.start()
      oscillator.stop(this.context.currentTime + duration)
    } catch (error) {
      console.warn('Game audio could not be played.', error)
    }
  }
}
