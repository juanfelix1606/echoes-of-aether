import { afterEach, describe, expect, it, vi } from 'vitest'
import { AudioSystem } from '../src/systems/AudioSystem'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('audio activation', () => {
  it('resumes a suspended context on unlock and schedules an audible cue', () => {
    const oscillator = {
      type: 'sine',
      frequency: { value: 0 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null,
    }
    const gain = {
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    }
    const resume = vi.fn().mockResolvedValue(undefined)
    const createOscillator = vi.fn(() => oscillator)
    vi.stubGlobal('AudioContext', class {
      state = 'suspended'
      currentTime = 0
      destination = {}
      resume = resume
      createOscillator = createOscillator
      createGain = () => gain
    })

    const audio = new AudioSystem(false)
    audio.unlock()
    expect(resume).toHaveBeenCalled()
    expect(createOscillator).toHaveBeenCalledOnce()
    expect(oscillator.start).toHaveBeenCalledOnce()
    expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0.08, 0)
  })

  it('does not play the unlock cue when the player has muted audio', () => {
    const createOscillator = vi.fn()
    vi.stubGlobal('AudioContext', class {
      state = 'running'
      createOscillator = createOscillator
    })
    new AudioSystem(true).unlock()
    expect(createOscillator).not.toHaveBeenCalled()
  })
})
