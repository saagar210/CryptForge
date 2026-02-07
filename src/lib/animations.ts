import type { GameEvent, Position } from "../types/game";

export interface Animation {
  type: "damage_number" | "attack_flash" | "death_fade" | "heal_number" | "level_up_flash" | "stairs_fade";
  position: Position;
  startTime: number;
  duration: number;
  value?: number;
  color?: string;
  progress: number;
}

const ACTIVE: Animation[] = [];

export function getActiveAnimations(): readonly Animation[] {
  return ACTIVE;
}

export function queueAnimationsFromEvents(events: GameEvent[]): void {
  const now = performance.now();

  for (const event of events) {
    if (event === "Victory") continue;

    if ("Attacked" in event) {
      // Damage number floats up from target position
      // We don't have target position in the event, so we skip positioning for now
      // The entity rendering handles flash on damage taken
    } else if ("DamageTaken" in event) {
      ACTIVE.push({
        type: "damage_number",
        position: { x: 0, y: 0 }, // Will be positioned per-entity in renderer
        startTime: now,
        duration: 600,
        value: event.DamageTaken.amount,
        color: "#FF4444",
        progress: 0,
      });
    } else if ("Healed" in event) {
      ACTIVE.push({
        type: "heal_number",
        position: { x: 0, y: 0 },
        startTime: now,
        duration: 600,
        value: event.Healed.amount,
        color: "#44FF44",
        progress: 0,
      });
    } else if ("LevelUp" in event) {
      ACTIVE.push({
        type: "level_up_flash",
        position: { x: 0, y: 0 },
        startTime: now,
        duration: 400,
        color: "#FFD700",
        progress: 0,
      });
    } else if ("StairsDescended" in event) {
      ACTIVE.push({
        type: "stairs_fade",
        position: { x: 0, y: 0 },
        startTime: now,
        duration: 500,
        progress: 0,
      });
    }
  }
}

export function updateAnimations(): void {
  const now = performance.now();
  for (let i = ACTIVE.length - 1; i >= 0; i--) {
    const anim = ACTIVE[i];
    if (!anim) continue;
    anim.progress = (now - anim.startTime) / anim.duration;
    if (anim.progress >= 1) {
      ACTIVE.splice(i, 1);
    }
  }
}

export function renderAnimations(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cameraX: number,
  cameraY: number,
  tileSize: number,
  playerPos: Position,
): void {
  for (const anim of ACTIVE) {
    switch (anim.type) {
      case "damage_number": {
        if (anim.value === undefined) break;
        const screenX = (playerPos.x - cameraX) * tileSize + tileSize / 2;
        const screenY = (playerPos.y - cameraY) * tileSize - anim.progress * 20;
        ctx.globalAlpha = 1 - anim.progress;
        ctx.font = "bold 14px monospace";
        ctx.fillStyle = anim.color ?? "#FF4444";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`-${anim.value}`, screenX, screenY);
        ctx.globalAlpha = 1;
        break;
      }
      case "heal_number": {
        if (anim.value === undefined) break;
        const hx = (playerPos.x - cameraX) * tileSize + tileSize / 2;
        const hy = (playerPos.y - cameraY) * tileSize - anim.progress * 20;
        ctx.globalAlpha = 1 - anim.progress;
        ctx.font = "bold 14px monospace";
        ctx.fillStyle = anim.color ?? "#44FF44";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`+${anim.value}`, hx, hy);
        ctx.globalAlpha = 1;
        break;
      }
      case "level_up_flash": {
        const alpha = 0.3 * (1 - anim.progress);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#FFD700";
        ctx.fillRect(0, 0, width, height);
        ctx.globalAlpha = 1;
        break;
      }
      case "stairs_fade": {
        // Fade to black and back
        const fadeProgress = anim.progress < 0.5
          ? anim.progress * 2
          : 2 - anim.progress * 2;
        ctx.globalAlpha = fadeProgress;
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, width, height);
        ctx.globalAlpha = 1;
        break;
      }
    }
  }
}
