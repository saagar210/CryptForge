import type { GameEvent, EntityView } from "../types/game";

export type ParticleType = "fire" | "poison" | "heal" | "gold" | "spell" | "ember" | "puff" | "ice";

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: ParticleType;
}

const PARTICLES: Particle[] = [];
const MAX_PARTICLES = 500;

export function getParticleCount(): number {
  return PARTICLES.length;
}

export function spawnParticles(type: ParticleType, worldX: number, worldY: number, count: number): void {
  for (let i = 0; i < count && PARTICLES.length < MAX_PARTICLES; i++) {
    PARTICLES.push(createParticle(type, worldX, worldY));
  }
}

function createParticle(type: ParticleType, wx: number, wy: number): Particle {
  const base = { x: wx + Math.random(), y: wy + Math.random(), type };

  switch (type) {
    case "fire":
      return {
        ...base,
        vx: (Math.random() - 0.5) * 0.02,
        vy: -Math.random() * 0.04 - 0.01,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 1.0,
        color: Math.random() > 0.5 ? "#FF6600" : "#FF9900",
        size: 2 + Math.random() * 2,
      };
    case "ember":
      return {
        ...base,
        vx: (Math.random() - 0.5) * 0.06,
        vy: -Math.random() * 0.06 - 0.02,
        life: 0.4 + Math.random() * 0.4,
        maxLife: 0.8,
        color: Math.random() > 0.3 ? "#FF4400" : "#FFAA00",
        size: 1.5 + Math.random() * 2.5,
      };
    case "poison":
      return {
        ...base,
        vx: (Math.random() - 0.5) * 0.03,
        vy: -Math.random() * 0.02 + Math.sin(Math.random() * Math.PI * 2) * 0.01,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1.0,
        color: Math.random() > 0.5 ? "#44FF44" : "#22CC22",
        size: 2 + Math.random() * 2,
      };
    case "puff":
      return {
        ...base,
        vx: (Math.random() - 0.5) * 0.04,
        vy: -Math.random() * 0.03,
        life: 0.3 + Math.random() * 0.3,
        maxLife: 0.6,
        color: Math.random() > 0.5 ? "#33DD33" : "#55FF55",
        size: 3 + Math.random() * 3,
      };
    case "heal":
      return {
        ...base,
        x: wx + 0.3 + Math.random() * 0.4,
        y: wy + 0.3 + Math.random() * 0.4,
        vx: (Math.random() - 0.5) * 0.03,
        vy: -Math.random() * 0.04 - 0.01,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        color: Math.random() > 0.5 ? "#00FFFF" : "#44FFFF",
        size: 1.5 + Math.random() * 2,
      };
    case "gold":
      return {
        ...base,
        vx: (Math.random() - 0.5) * 0.05,
        vy: -Math.random() * 0.05 - 0.02,
        life: 0.3 + Math.random() * 0.3,
        maxLife: 0.6,
        color: Math.random() > 0.5 ? "#FFD700" : "#FFAA00",
        size: 1.5 + Math.random() * 1.5,
      };
    case "spell":
      return {
        ...base,
        vx: (Math.random() - 0.5) * 0.04,
        vy: (Math.random() - 0.5) * 0.04,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        color: Math.random() > 0.5 ? "#AA44FF" : "#6644FF",
        size: 2 + Math.random() * 2,
      };
    case "ice":
      return {
        ...base,
        vx: (Math.random() - 0.5) * 0.03,
        vy: -Math.random() * 0.02,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        color: Math.random() > 0.5 ? "#88CCFF" : "#AADDFF",
        size: 1.5 + Math.random() * 2,
      };
  }
}

export function updateParticles(dt: number): void {
  for (let i = PARTICLES.length - 1; i >= 0; i--) {
    const p = PARTICLES[i];
    if (!p) continue;
    p.x += p.vx;
    p.y += p.vy;
    p.life -= dt;
    if (p.life <= 0) {
      PARTICLES.splice(i, 1);
    }
  }
}

export function renderParticles(
  ctx: CanvasRenderingContext2D,
  cameraX: number,
  cameraY: number,
  tileSize: number,
): void {
  for (const p of PARTICLES) {
    const screenX = (p.x - cameraX) * tileSize;
    const screenY = (p.y - cameraY) * tileSize;
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(screenX, screenY, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function queueParticlesFromEvents(events: GameEvent[], entities?: EntityView[]): void {
  const findPos = (entityId: number) => entities?.find((e) => e.id === entityId)?.position;

  for (const event of events) {
    if (event === "Victory") continue;

    if ("StatusApplied" in event) {
      const pos = findPos(event.StatusApplied.entity_id);
      if (!pos) continue;
      switch (event.StatusApplied.effect) {
        case "Burning":
          spawnParticles("fire", pos.x, pos.y, 8);
          break;
        case "Poison":
          spawnParticles("poison", pos.x, pos.y, 8);
          break;
        case "Slowed":
          spawnParticles("ice", pos.x, pos.y, 6);
          break;
      }
    } else if ("Healed" in event) {
      const pos = findPos(event.Healed.entity_id);
      if (pos) spawnParticles("heal", pos.x, pos.y, 10);
    } else if ("GoldGained" in event) {
      // Spawn gold at player position (entity 0)
      const pos = findPos(0);
      if (pos) spawnParticles("gold", pos.x, pos.y, 6);
    } else if ("AbilityUsed" in event) {
      spawnParticles("spell", event.AbilityUsed.position.x, event.AbilityUsed.position.y, 12);
    }
  }
}

export function queueParticlesFromStatus(entities: EntityView[]): void {
  for (const entity of entities) {
    if (!entity.status_effects) continue;
    for (const effect of entity.status_effects) {
      // Ambient particles: 1 per frame to keep it subtle
      if (effect.effect_type === "Burning" && Math.random() < 0.3) {
        spawnParticles("fire", entity.position.x, entity.position.y, 1);
      } else if (effect.effect_type === "Poison" && Math.random() < 0.2) {
        spawnParticles("poison", entity.position.x, entity.position.y, 1);
      }
    }
  }
}
