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
    if (!this.muted) this.playTone(523.25, 0.15, 'triangle', 0.08)
    return this.muted
  }

  setMuted(muted: boolean): void {
    this.muted = muted
  }

  unlock(): void {
    try {
      this.context ??= new AudioContext()
      if (this.context.state === 'suspended') {
        void this.context.resume().catch((error: unknown) => console.warn('Unable to resume game audio.', error))
      }
      this.playTone(523.25, 0.15, 'triangle', 0.08)
    } catch (error) {
      console.warn('Game audio could not be unlocked.', error)
    }
  }

  setZone(zone: ZoneId | 'boss'): void {
    this.stopMusic()
    const melody: Record<ZoneId | 'boss', number[]> = {
      village: [392, 440, 523.25, 493.88, 392, 329.63, 349.23, 392, 440, 392, 349.23, 329.63, 293.66, 329.63, 349.23, 392],
      forest: [293.66, 349.23, 392, 349.23, 293.66, 261.63, 233.08, 261.63, 293.66, 349.23, 440, 392, 349.23, 293.66, 261.63, 233.08],
      dungeon: [220, 261.63, 293.66, 261.63, 220, 196, 174.61, 196, 220, 261.63, 329.63, 293.66, 261.63, 220, 196, 174.61],
      boss: [220, 329.63, 293.66, 261.63, 220, 329.63, 392, 329.63, 233.08, 349.23, 329.63, 293.66, 233.08, 349.23, 440, 392],
    }
    const bass: Record<ZoneId | 'boss', number[]> = {
      village: [130.81, 146.83, 164.81, 174.61],
      forest: [98, 116.54, 130.81, 110],
      dungeon: [73.42, 87.31, 98, 82.41],
      boss: [110, 110, 116.54, 98],
    }
    this.musicStep = 0
    this.musicTimer = window.setInterval(() => {
      const note = melody[zone][this.musicStep % melody[zone].length]
      if (this.musicStep % 4 === 0) this.playTone(bass[zone][Math.floor(this.musicStep / 4) % 4], 0.9, 'triangle', 0.04)
      this.playTone(note, zone === 'boss' ? 0.17 : 0.34, zone === 'boss' ? 'triangle' : 'sine', 0.045)
      this.musicStep += 1
    }, zone === 'boss' ? 290 : 480)
  }

  stopMusic(): void {
    if (this.musicTimer !== undefined) window.clearInterval(this.musicTimer)
    this.musicTimer = undefined
  }

  dispose(): void {
    this.stopMusic()
    if (this.context) {
      void this.context.close().catch((error: unknown) => console.warn('Unable to close game audio.', error))
      this.context = undefined
    }
  }

  playTone(frequency: number, duration = 0.1, waveform: OscillatorType = 'sine', volume = 0.06): void {
    if (this.muted) return

    try {
      this.context ??= new AudioContext()
      if (this.context.state === 'suspended') {
        void this.context.resume().catch((error: unknown) => console.warn('Unable to resume game audio.', error))
      }
      const oscillator = this.context.createOscillator()
      const gain = this.context.createGain()
      oscillator.type = waveform
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(volume, this.context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + duration)
      oscillator.connect(gain)
      gain.connect(this.context.destination)
      oscillator.onended = () => {
        oscillator.disconnect()
        gain.disconnect()
      }
      oscillator.start()
      oscillator.stop(this.context.currentTime + duration)
    } catch (error) {
      console.warn('Game audio could not be played.', error)
    }
  }
}
