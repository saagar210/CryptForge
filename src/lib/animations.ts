import type { GameEvent, Position, EntityView } from "../types/game";

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

export function queueAnimationsFromEvents(events: GameEvent[], entities?: EntityView[]): void {
  const now = performance.now();

  const findPos = (entityId: number): Position | undefined => {
    return entities?.find((e) => e.id === entityId)?.position;
  };

  for (const event of events) {
    if (event === "Victory") continue;

    if ("DamageTaken" in event) {
      const pos = findPos(event.DamageTaken.entity_id) ?? { x: 0, y: 0 };
      ACTIVE.push({
        type: "damage_number",
        position: pos,
        startTime: now,
        duration: 600,
        value: event.DamageTaken.amount,
        color: "#FF4444",
        progress: 0,
      });
    } else if ("Attacked" in event) {
      if (event.Attacked.killed) {
        const pos = findPos(event.Attacked.target_id) ?? { x: 0, y: 0 };
        ACTIVE.push({
          type: "death_fade",
          position: pos,
          startTime: now,
          duration: 300,
          color: "#FF0000",
          progress: 0,
        });
      }
    } else if ("Healed" in event) {
      const pos = findPos(event.Healed.entity_id) ?? { x: 0, y: 0 };
      ACTIVE.push({
        type: "heal_number",
        position: pos,
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
  _playerPos: Position,
): void {
  for (const anim of ACTIVE) {
    switch (anim.type) {
      case "damage_number": {
        if (anim.value === undefined) break;
        const screenX = (anim.position.x - cameraX) * tileSize + tileSize / 2;
        const screenY = (anim.position.y - cameraY) * tileSize - anim.progress * 20;
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
        const hx = (anim.position.x - cameraX) * tileSize + tileSize / 2;
        const hy = (anim.position.y - cameraY) * tileSize - anim.progress * 20;
        ctx.globalAlpha = 1 - anim.progress;
        ctx.font = "bold 14px monospace";
        ctx.fillStyle = anim.color ?? "#44FF44";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`+${anim.value}`, hx, hy);
        ctx.globalAlpha = 1;
        break;
      }
      case "death_fade": {
        const dx = (anim.position.x - cameraX) * tileSize;
        const dy = (anim.position.y - cameraY) * tileSize;
        ctx.globalAlpha = 0.5 * (1 - anim.progress);
        ctx.fillStyle = "#FF0000";
        ctx.fillRect(dx, dy, tileSize, tileSize);
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
