import type { VisibleTile, EntityView, Position, Biome } from "../types/game";
import { isSpriteTileset, getTileSprite, getEntitySprite, drawSprite, BIOME_PALETTES, type BiomePalette } from "./tiles";

const TILE_SIZE = 32;

// Tile colors
const COLORS: Record<string, string> = {
  Wall: "#333340",
  Floor: "#1a1a2e",
  DoorClosed: "#8B4513",
  DoorOpen: "#654321",
  DownStairs: "#00CED1",
  UpStairs: "#20B2AA",
};

const EXPLORED_ALPHA = 0.35;

// FOV transition alpha map — smooth fade in/out
const tileAlphaMap = new Map<string, number>();
const FOV_LERP_SPEED = 0.15;

// Entity colors by type
const ENTITY_COLORS: Record<string, string> = {
  Player: "#FFD700",
  Enemy: "#FF4444",
  Item: "#44FF44",
  Door: "#8B4513",
  Trap: "#FF6600",
  Stairs: "#00CED1",
};

// Common entity glyphs
const ENTITY_GLYPHS: Record<number, string> = {
  0x40: "@",  // Player
  0x67: "g",  // goblin-class
  0x72: "r",  // rat
  0x73: "s",  // skeleton/spider
  0x6F: "o",  // orc
  0x6D: "m",  // mage
  0x54: "T",  // troll
  0x56: "V",  // vampire
  0x4D: "M",  // mimic
  0x57: "W",  // wraith
  0x46: "F",  // fire elemental
  0x49: "I",  // ice golem
  0x53: "S",  // shadow
  0x4E: "N",  // necromancer
  0x47: "G",  // Goblin King (boss)
  0x42: "B",  // boss generic
  0x4C: "L",  // Lich
  0x2F: "/",  // weapon
  0x5B: "[",  // armor
  0x29: ")",  // shield
  0x3D: "=",  // ring
  0x22: "\"", // amulet
  0x21: "!",  // potion
  0x3F: "?",  // scroll
  0x2D: "-",  // wand
  0x25: "%",  // food
  0x7E: "~",  // key
  0x2B: "+",  // door
  0x5E: "^",  // trap
  0x3E: ">",  // stairs down
  0x3C: "<",  // stairs up
  0x24: "$",  // shopkeeper
  0x7D: "}",  // bow
};

export interface Camera {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
}

export function createCamera(): Camera {
  return { x: 0, y: 0, targetX: 0, targetY: 0 };
}

export function updateCamera(camera: Camera, playerPos: Position, canvasWidth: number, canvasHeight: number): void {
  const viewportTilesX = Math.floor(canvasWidth / TILE_SIZE);
  const viewportTilesY = Math.floor(canvasHeight / TILE_SIZE);

  camera.targetX = playerPos.x - Math.floor(viewportTilesX / 2);
  camera.targetY = playerPos.y - Math.floor(viewportTilesY / 2);

  // Smooth lerp
  camera.x += (camera.targetX - camera.x) * 0.3;
  camera.y += (camera.targetY - camera.y) * 0.3;

  // Snap when close enough
  if (Math.abs(camera.x - camera.targetX) < 0.01) camera.x = camera.targetX;
  if (Math.abs(camera.y - camera.targetY) < 0.01) camera.y = camera.targetY;
}

export interface HoveredTile {
  x: number;
  y: number;
}

export interface TargetingState {
  cursor: Position;
  playerPos: Position;
  range: number;
  validTargetIds: number[];
}

/** Bresenham line from (x0,y0) to (x1,y1) — returns array of points. */
function bresenhamLine(x0: number, y0: number, x1: number, y1: number): Position[] {
  const points: Position[] = [];
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  const maxIterations = dx - dy + 2; // Manhattan distance + slack

  for (let i = 0; i < maxIterations; i++) {
    points.push({ x, y });
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
  return points;
}

// Screen shake state
let shakeOffsetX = 0;
let shakeOffsetY = 0;
let shakeDecay = 0;
let shakeStartTime = 0;
const SHAKE_DURATION = 150;

/** Clear FOV alpha map (call on floor change). */
export function clearFovAlphaMap(): void {
  tileAlphaMap.clear();
}

/** Cap the FOV alpha map to prevent unbounded memory growth. */
const MAX_FOV_ENTRIES = 20000;
function pruneAlphaMap(): void {
  if (tileAlphaMap.size > MAX_FOV_ENTRIES) {
    // Remove oldest entries (first inserted)
    const excess = tileAlphaMap.size - MAX_FOV_ENTRIES;
    const iter = tileAlphaMap.keys();
    for (let i = 0; i < excess; i++) {
      const key = iter.next().value;
      if (key !== undefined) tileAlphaMap.delete(key);
    }
  }
}

/** Reset screen shake state (call on new game or session change). */
export function resetShakeState(): void {
  shakeOffsetX = 0;
  shakeOffsetY = 0;
  shakeDecay = 0;
  shakeStartTime = 0;
}

export function triggerShake(intensity: number): void {
  shakeOffsetX = (Math.random() - 0.5) * 2 * intensity;
  shakeOffsetY = (Math.random() - 0.5) * 2 * intensity;
  shakeDecay = intensity;
  shakeStartTime = performance.now();
}

function updateShake(): void {
  if (shakeDecay <= 0) return;
  const elapsed = performance.now() - shakeStartTime;
  if (elapsed >= SHAKE_DURATION) {
    shakeOffsetX = 0;
    shakeOffsetY = 0;
    shakeDecay = 0;
    return;
  }
  const t = elapsed / SHAKE_DURATION;
  const factor = 1 - t;
  shakeOffsetX = (Math.random() - 0.5) * 2 * shakeDecay * factor;
  shakeOffsetY = (Math.random() - 0.5) * 2 * shakeDecay * factor;
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  camera: Camera,
  tiles: VisibleTile[],
  entities: EntityView[],
  hoveredTile?: HoveredTile | null,
  biome?: Biome,
  targeting?: TargetingState | null,
): void {
  // Clear
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  // Apply screen shake
  updateShake();
  pruneAlphaMap();
  ctx.save();
  ctx.translate(shakeOffsetX, shakeOffsetY);

  // Get biome palette for ASCII mode
  const palette: BiomePalette = BIOME_PALETTES[biome ?? "Dungeon"] ?? BIOME_PALETTES.Dungeon!;
  const useSprites = isSpriteTileset();

  // Render tiles
  for (const tile of tiles) {
    const screenX = (tile.x - camera.x) * TILE_SIZE;
    const screenY = (tile.y - camera.y) * TILE_SIZE;

    // Skip off-screen tiles
    if (screenX < -TILE_SIZE || screenX > width || screenY < -TILE_SIZE || screenY > height) {
      continue;
    }

    if (!tile.visible && !tile.explored) continue;

    // Smooth FOV transitions
    const key = `${tile.x},${tile.y}`;
    const targetAlpha = tile.visible ? 1.0 : tile.explored ? EXPLORED_ALPHA : 0.0;
    const currentAlpha = tileAlphaMap.get(key) ?? targetAlpha;
    const newAlpha = currentAlpha + (targetAlpha - currentAlpha) * FOV_LERP_SPEED;
    tileAlphaMap.set(key, newAlpha);
    ctx.globalAlpha = newAlpha;

    if (useSprites) {
      const sprite = getTileSprite(tile.tile_type);
      if (sprite) {
        drawSprite(ctx, sprite, screenX, screenY, TILE_SIZE);
      } else {
        ctx.fillStyle = palette.floor;
        ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      }
    } else {
      // ASCII mode — use biome palette
      let color: string;
      if (tile.tile_type === "Wall") {
        color = tile.visible ? palette.wall : palette.wallDark;
      } else if (tile.tile_type === "Floor") {
        color = tile.visible ? palette.floor : palette.floorDark;
      } else {
        color = COLORS[tile.tile_type] ?? palette.floor;
      }
      ctx.fillStyle = color;
      ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
    }

    ctx.globalAlpha = 1.0;
  }

  // Render entities (sorted by render priority — items first, then enemies, then player)
  const sortedEntities = [...entities].sort((a, b) => {
    const order: Record<string, number> = { Stairs: 0, Door: 1, Trap: 1, Item: 2, Enemy: 3, Player: 4 };
    return (order[a.entity_type] ?? 0) - (order[b.entity_type] ?? 0);
  });

  ctx.font = `${TILE_SIZE - 4}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const entity of sortedEntities) {
    const screenX = (entity.position.x - camera.x) * TILE_SIZE;
    const screenY = (entity.position.y - camera.y) * TILE_SIZE;

    if (screenX < -TILE_SIZE || screenX > width || screenY < -TILE_SIZE || screenY > height) {
      continue;
    }

    if (useSprites) {
      const sprite = getEntitySprite(entity.glyph);
      if (sprite) {
        drawSprite(ctx, sprite, screenX, screenY, TILE_SIZE);
      } else {
        // Fallback to glyph
        const color = ENTITY_COLORS[entity.entity_type] ?? "#FFFFFF";
        const glyph = ENTITY_GLYPHS[entity.glyph] ?? "?";
        ctx.fillStyle = color;
        ctx.fillText(glyph, screenX + TILE_SIZE / 2, screenY + TILE_SIZE / 2);
      }
    } else {
      const color = ENTITY_COLORS[entity.entity_type] ?? "#FFFFFF";
      const glyph = ENTITY_GLYPHS[entity.glyph] ?? "?";
      ctx.fillStyle = color;
      ctx.fillText(glyph, screenX + TILE_SIZE / 2, screenY + TILE_SIZE / 2);
    }

    // Elite glow
    if (entity.elite) {
      const eliteColors: Record<string, string> = {
        Frenzied: "#FF4444",
        Armored: "#CCCCCC",
        Venomous: "#44FF44",
        Spectral: "#AA44FF",
      };
      const glowColor = eliteColors[entity.elite] ?? "#FFFFFF";
      ctx.globalAlpha = 0.3 + Math.sin(performance.now() / 300) * 0.15;
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX + 1, screenY + 1, TILE_SIZE - 2, TILE_SIZE - 2);
      ctx.globalAlpha = 1;
    }

    // Ally tint
    if (entity.is_ally && entity.entity_type === "Enemy") {
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = "#00CCFF";
      ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      ctx.globalAlpha = 1;
    }

    // HP bar for enemies and allies
    if ((entity.entity_type === "Enemy" || entity.is_ally) && entity.hp) {
      const [current, max] = entity.hp;
      const barWidth = TILE_SIZE - 4;
      const barHeight = 3;
      const barX = screenX + 2;
      const barY = screenY + TILE_SIZE - 5;
      const fillWidth = (current / max) * barWidth;

      ctx.fillStyle = "#333";
      ctx.fillRect(barX, barY, barWidth, barHeight);
      ctx.fillStyle = entity.is_ally
        ? "#44AAFF"
        : current / max > 0.5 ? "#44FF44" : current / max > 0.25 ? "#FFAA00" : "#FF4444";
      ctx.fillRect(barX, barY, fillWidth, barHeight);
    }
  }

  // Hovered tile outline (skip in targeting mode — targeting draws its own cursor)
  if (hoveredTile && !targeting) {
    const hx = (hoveredTile.x - camera.x) * TILE_SIZE;
    const hy = (hoveredTile.y - camera.y) * TILE_SIZE;
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 2;
    ctx.strokeRect(hx + 1, hy + 1, TILE_SIZE - 2, TILE_SIZE - 2);
  }

  // Targeting overlay
  if (targeting) {
    const { cursor, playerPos, range } = targeting;

    // Dim tiles outside range with subtle blue overlay within range
    const viewTilesX = Math.ceil(width / TILE_SIZE) + 2;
    const viewTilesY = Math.ceil(height / TILE_SIZE) + 2;
    const startTileX = Math.floor(camera.x);
    const startTileY = Math.floor(camera.y);

    for (let ty = startTileY; ty < startTileY + viewTilesY; ty++) {
      for (let tx = startTileX; tx < startTileX + viewTilesX; tx++) {
        const dist = Math.max(Math.abs(tx - playerPos.x), Math.abs(ty - playerPos.y));
        const sx = (tx - camera.x) * TILE_SIZE;
        const sy = (ty - camera.y) * TILE_SIZE;
        if (dist > range) {
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = "#000000";
          ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
        } else if (dist > 0) {
          ctx.globalAlpha = 0.08;
          ctx.fillStyle = "#4488FF";
          ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
        }
      }
    }
    ctx.globalAlpha = 1;

    // Bresenham LOS line from player to cursor
    const losLine = bresenhamLine(playerPos.x, playerPos.y, cursor.x, cursor.y);
    const dist = Math.max(Math.abs(cursor.x - playerPos.x), Math.abs(cursor.y - playerPos.y));
    const inRange = dist <= range;

    // Check if any wall blocks the line (use tile data)
    const tileMap = new Map<string, VisibleTile>();
    for (const t of tiles) {
      tileMap.set(`${t.x},${t.y}`, t);
    }
    let blocked = false;
    for (let i = 1; i < losLine.length - 1; i++) {
      const p = losLine[i]!;
      const t = tileMap.get(`${p.x},${p.y}`);
      if (t && t.tile_type === "Wall") {
        blocked = true;
        break;
      }
    }
    // Also check the target tile itself
    const targetTile = tileMap.get(`${cursor.x},${cursor.y}`);
    if (targetTile && targetTile.tile_type === "Wall") {
      blocked = true;
    }

    // Draw LOS line tiles (skip player position)
    for (let i = 1; i < losLine.length; i++) {
      const p = losLine[i]!;
      const lx = (p.x - camera.x) * TILE_SIZE;
      const ly = (p.y - camera.y) * TILE_SIZE;
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = blocked || !inRange ? "#FF4444" : "#44FF44";
      ctx.fillRect(lx, ly, TILE_SIZE, TILE_SIZE);
    }
    ctx.globalAlpha = 1;

    // Crosshair at cursor (blinking)
    const blink = Math.sin(performance.now() / 150) > 0;
    if (blink) {
      const cx = (cursor.x - camera.x) * TILE_SIZE;
      const cy = (cursor.y - camera.y) * TILE_SIZE;
      ctx.strokeStyle = blocked || !inRange ? "#FF4444" : "#FFD700";
      ctx.lineWidth = 2;
      ctx.strokeRect(cx + 1, cy + 1, TILE_SIZE - 2, TILE_SIZE - 2);

      // Draw crosshair lines
      const centerX = cx + TILE_SIZE / 2;
      const centerY = cy + TILE_SIZE / 2;
      ctx.beginPath();
      ctx.moveTo(centerX - 6, centerY);
      ctx.lineTo(centerX - 2, centerY);
      ctx.moveTo(centerX + 2, centerY);
      ctx.lineTo(centerX + 6, centerY);
      ctx.moveTo(centerX, centerY - 6);
      ctx.lineTo(centerX, centerY - 2);
      ctx.moveTo(centerX, centerY + 2);
      ctx.lineTo(centerX, centerY + 6);
      ctx.stroke();
    }
  }

  ctx.restore(); // end shake translate
}

export function renderMinimap(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  mapWidth: number,
  mapHeight: number,
  tiles: number[],
  playerX: number,
  playerY: number,
): void {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);

  if (mapWidth === 0 || mapHeight === 0) return;

  const scaleX = width / mapWidth;
  const scaleY = height / mapHeight;
  const scale = Math.min(scaleX, scaleY);

  const offsetX = (width - mapWidth * scale) / 2;
  const offsetY = (height - mapHeight * scale) / 2;

  const minimapColors = ["#000", "#444", "#222", "#0AA"];

  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      const tile = tiles[y * mapWidth + x];
      if (tile === undefined || tile === 0) continue;

      ctx.fillStyle = minimapColors[tile] ?? "#222";
      ctx.fillRect(offsetX + x * scale, offsetY + y * scale, Math.max(scale, 1), Math.max(scale, 1));
    }
  }

  // Player dot
  ctx.fillStyle = "#FFD700";
  const px = offsetX + playerX * scale;
  const py = offsetY + playerY * scale;
  ctx.fillRect(px - 1, py - 1, Math.max(scale + 2, 3), Math.max(scale + 2, 3));
}
