import type { GameEvent, Position, EntityView } from "../types/game";
import { triggerShake } from "./renderer";
import { spawnParticles } from "./particles";

export interface Animation {
  type: "damage_number" | "attack_flash" | "death_fade" | "heal_number" | "level_up_flash" | "stairs_fade" | "screen_shake" | "projectile";
  position: Position;
  startTime: number;
  duration: number;
  value?: number;
  color?: string;
  progress: number;
  targetPosition?: Position;
}

const ACTIVE: Animation[] = [];
const MAX_ANIMATIONS = 100;

export function getActiveAnimations(): readonly Animation[] {
  return ACTIVE;
}

export function queueAnimationsFromEvents(events: GameEvent[], entities?: EntityView[]): void {
  const now = performance.now();

  const findPos = (entityId: number): Position | undefined => {
    return entities?.find((e) => e.id === entityId)?.position;
  };

  for (const event of events) {
    // Cap active animations to prevent unbounded growth
    if (ACTIVE.length >= MAX_ANIMATIONS) break;
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
      // Shake when player takes damage
      if (entities?.find((e) => e.id === event.DamageTaken.entity_id)?.entity_type === "Player") {
        triggerShake(3);
      }
    } else if ("Attacked" in event) {
      if (event.Attacked.killed) {
        const pos = findPos(event.Attacked.target_id) ?? { x: 0, y: 0 };
        const dmgType = event.Attacked.damage_type ?? "physical";
        let color = "#FF0000";
        if (dmgType === "fire") {
          color = "#FF6600";
          spawnParticles("ember", pos.x, pos.y, 30);
        } else if (dmgType === "poison") {
          color = "#33FF33";
          spawnParticles("puff", pos.x, pos.y, 25);
        } else if (dmgType === "ice") {
          color = "#88CCFF";
          spawnParticles("ice", pos.x, pos.y, 15);
        }
        ACTIVE.push({
          type: "death_fade",
          position: pos,
          startTime: now,
          duration: 300,
          color,
          progress: 0,
        });
        triggerShake(2);
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
    } else if ("ProjectileFired" in event) {
      ACTIVE.push({
        type: "projectile",
        position: event.ProjectileFired.from,
        targetPosition: event.ProjectileFired.to,
        startTime: now,
        duration: 150,
        color: "#FFAA00",
        progress: 0,
      });
    } else if ("BossDefeated" in event) {
      triggerShake(6);
    } else if ("SecretRoomFound" in event) {
      ACTIVE.push({
        type: "level_up_flash",
        position: event.SecretRoomFound.position,
        startTime: now,
        duration: 500,
        color: "#FFD700",
        progress: 0,
      });
      spawnParticles("gold", event.SecretRoomFound.position.x, event.SecretRoomFound.position.y, 20);
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
      case "projectile": {
        if (!anim.targetPosition) break;
        const fromX = (anim.position.x - cameraX) * tileSize + tileSize / 2;
        const fromY = (anim.position.y - cameraY) * tileSize + tileSize / 2;
        const toX = (anim.targetPosition.x - cameraX) * tileSize + tileSize / 2;
        const toY = (anim.targetPosition.y - cameraY) * tileSize + tileSize / 2;
        const px = fromX + (toX - fromX) * anim.progress;
        const py = fromY + (toY - fromY) * anim.progress;
        ctx.globalAlpha = 1 - anim.progress * 0.5;
        ctx.fillStyle = anim.color ?? "#FFAA00";
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }
    }
  }
}
