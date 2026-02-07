/**
 * Procedural audio engine using Web Audio API.
 * All sounds are synthesized — no external audio files needed.
 */

export type SoundEffect =
  | "move"
  | "attack_hit"
  | "attack_kill"
  | "take_damage"
  | "enemy_death"
  | "item_pickup"
  | "potion_use"
  | "scroll_use"
  | "door_open"
  | "stairs_descend"
  | "trap_triggered"
  | "level_up"
  | "boss_encounter"
  | "player_death"
  | "victory";

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// Volume state (0-100)
let masterVol = 80;
let sfxVol = 80;
let ambientVol = 50;

export function setVolumes(master: number, sfx: number, ambient: number): void {
  masterVol = master;
  sfxVol = sfx;
  ambientVol = ambient;
  if (ambientGain) {
    ambientGain.gain.setValueAtTime(
      (masterVol / 100) * (ambientVol / 100) * 0.3,
      getCtx().currentTime,
    );
  }
}

function sfxGainValue(): number {
  return (masterVol / 100) * (sfxVol / 100);
}

// --- Ambient ---
let ambientSource: AudioBufferSourceNode | null = null;
let ambientGain: GainNode | null = null;

export function startAmbient(): void {
  if (ambientSource) return;
  const ctx = getCtx();
  const sampleRate = ctx.sampleRate;
  const duration = 4;
  const length = sampleRate * duration;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  // Brownian noise (filtered random walk) for dungeon ambiance
  let val = 0;
  for (let i = 0; i < length; i++) {
    val += (Math.random() * 2 - 1) * 0.02;
    val *= 0.998;
    // Add occasional drip-like transients
    if (Math.random() < 0.0001) {
      val += (Math.random() - 0.5) * 0.3;
    }
    data[i] = val;
  }

  ambientGain = ctx.createGain();
  ambientGain.gain.setValueAtTime(
    (masterVol / 100) * (ambientVol / 100) * 0.3,
    ctx.currentTime,
  );
  ambientGain.connect(ctx.destination);

  // Low-pass filter for muffled underground feel
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 400;
  filter.connect(ambientGain);

  ambientSource = ctx.createBufferSource();
  ambientSource.buffer = buffer;
  ambientSource.loop = true;
  ambientSource.connect(filter);
  ambientSource.start();
}

export function stopAmbient(): void {
  if (ambientSource) {
    ambientSource.stop();
    ambientSource.disconnect();
    ambientSource = null;
  }
  if (ambientGain) {
    ambientGain.disconnect();
    ambientGain = null;
  }
}

// --- Sound effect synthesizers ---

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType,
  volume: number,
  freqEnd?: number,
): void {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const vol = volume * sfxGainValue();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  if (freqEnd !== undefined) {
    osc.frequency.linearRampToValueAtTime(freqEnd, ctx.currentTime + duration);
  }

  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playNoise(duration: number, volume: number, highpass?: number): void {
  const ctx = getCtx();
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const gain = ctx.createGain();
  const vol = volume * sfxGainValue();
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  if (highpass) {
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = highpass;
    source.connect(filter);
    filter.connect(gain);
  } else {
    source.connect(gain);
  }
  gain.connect(ctx.destination);
  source.start(ctx.currentTime);
  source.stop(ctx.currentTime + duration);
}

// --- Individual sound effects ---

function sfxMove(): void {
  playNoise(0.06, 0.08, 2000);
}

function sfxAttackHit(): void {
  playNoise(0.08, 0.25, 1000);
  playTone(200, 0.1, "square", 0.15, 100);
}

function sfxAttackKill(): void {
  playNoise(0.12, 0.3, 800);
  playTone(300, 0.15, "square", 0.2, 80);
  playTone(150, 0.1, "sawtooth", 0.15, 50);
}

function sfxTakeDamage(): void {
  playTone(400, 0.12, "square", 0.2, 200);
  playNoise(0.08, 0.15, 500);
}

function sfxEnemyDeath(): void {
  playTone(300, 0.15, "square", 0.2, 60);
  playNoise(0.1, 0.2);
}

function sfxItemPickup(): void {
  playTone(600, 0.05, "square", 0.15);
  setTimeout(() => playTone(900, 0.05, "square", 0.15), 50);
}

function sfxPotionUse(): void {
  playTone(300, 0.15, "sine", 0.15, 600);
  setTimeout(() => playTone(500, 0.1, "sine", 0.1, 800), 80);
}

function sfxScrollUse(): void {
  playTone(800, 0.1, "sine", 0.12, 1200);
  setTimeout(() => playTone(1000, 0.1, "sine", 0.1, 1400), 60);
  setTimeout(() => playTone(1200, 0.15, "sine", 0.08, 600), 120);
}

function sfxDoorOpen(): void {
  playTone(100, 0.15, "sawtooth", 0.12, 80);
  playNoise(0.1, 0.1, 300);
}

function sfxStairsDescend(): void {
  playTone(500, 0.3, "triangle", 0.15, 150);
}

function sfxTrapTriggered(): void {
  playTone(800, 0.08, "square", 0.25, 200);
  playNoise(0.1, 0.2, 1500);
}

function sfxLevelUp(): void {
  const notes = [400, 500, 600, 800];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.12, "square", 0.15), i * 80);
  });
}

function sfxBossEncounter(): void {
  playTone(100, 0.4, "sawtooth", 0.2, 60);
  setTimeout(() => playTone(80, 0.3, "sawtooth", 0.15, 50), 200);
  playNoise(0.5, 0.1, 100);
}

function sfxPlayerDeath(): void {
  const notes = [400, 350, 300, 200, 100];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.12, "square", 0.15, freq - 30), i * 90);
  });
}

function sfxVictory(): void {
  const notes = [400, 500, 600, 500, 600, 800];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.12, "square", 0.15), i * 100);
  });
  setTimeout(() => playTone(800, 0.3, "square", 0.2), 600);
}

// --- Public API ---

const SFX_MAP: Record<SoundEffect, () => void> = {
  move: sfxMove,
  attack_hit: sfxAttackHit,
  attack_kill: sfxAttackKill,
  take_damage: sfxTakeDamage,
  enemy_death: sfxEnemyDeath,
  item_pickup: sfxItemPickup,
  potion_use: sfxPotionUse,
  scroll_use: sfxScrollUse,
  door_open: sfxDoorOpen,
  stairs_descend: sfxStairsDescend,
  trap_triggered: sfxTrapTriggered,
  level_up: sfxLevelUp,
  boss_encounter: sfxBossEncounter,
  player_death: sfxPlayerDeath,
  victory: sfxVictory,
};

export function playSfx(effect: SoundEffect): void {
  SFX_MAP[effect]();
}

export function initAudio(): void {
  getCtx();
}
