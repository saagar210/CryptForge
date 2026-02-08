import { useEffect, useRef } from "react";
import type { GameEvent, Biome } from "../types/game";
import { playSfx, initAudio, startAmbient, stopAmbient, setVolumes, updateAmbientBiome } from "../lib/audio";

export function useAudio(
  events: GameEvent[],
  masterVolume: number,
  sfxVolume: number,
  ambientVolume: number,
  biome?: Biome,
): void {
  const initialized = useRef(false);
  const prevEventsRef = useRef<GameEvent[]>([]);

  // Initialize audio context on first user interaction
  useEffect(() => {
    const handleInteraction = () => {
      if (!initialized.current) {
        initAudio();
        startAmbient();
        initialized.current = true;
      }
    };
    window.addEventListener("keydown", handleInteraction, { once: true });
    window.addEventListener("click", handleInteraction, { once: true });
    return () => {
      window.removeEventListener("keydown", handleInteraction);
      window.removeEventListener("click", handleInteraction);
      if (initialized.current) {
        stopAmbient();
      }
    };
  }, []);

  // Update volumes
  useEffect(() => {
    setVolumes(masterVolume, sfxVolume, ambientVolume);
  }, [masterVolume, sfxVolume, ambientVolume]);

  // Update ambient for biome
  useEffect(() => {
    if (biome && initialized.current) {
      updateAmbientBiome(biome);
    }
  }, [biome]);

  // Play sounds for new events
  useEffect(() => {
    if (events === prevEventsRef.current) return;
    prevEventsRef.current = events;

    if (!initialized.current) return;

    for (const event of events) {
      if (event === "Victory") {
        playSfx("victory");
        continue;
      }

      if ("Moved" in event) {
        playSfx("move");
      } else if ("Attacked" in event) {
        if (event.Attacked.killed) {
          playSfx("attack_kill");
        } else {
          playSfx("attack_hit");
        }
      } else if ("DamageTaken" in event) {
        playSfx("take_damage");
      } else if ("ItemPickedUp" in event) {
        playSfx("item_pickup");
      } else if ("ItemUsed" in event) {
        const effect = event.ItemUsed.effect;
        if (effect.includes("scroll") || effect.includes("Scroll")) {
          playSfx("scroll_use");
        } else {
          playSfx("potion_use");
        }
      } else if ("DoorOpened" in event) {
        playSfx("door_open");
      } else if ("TrapTriggered" in event) {
        playSfx("trap_triggered");
      } else if ("StairsDescended" in event) {
        playSfx("stairs_descend");
      } else if ("LevelUp" in event) {
        playSfx("level_up");
      } else if ("EnemySpotted" in event) {
        // Could add a subtle alert sound, but keep it quiet for now
      } else if ("PlayerDied" in event) {
        playSfx("player_death");
      } else if ("BossDefeated" in event) {
        playSfx("victory");
      }
    }
  }, [events]);
}
