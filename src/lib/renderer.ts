import type { VisibleTile, EntityView, Position } from "../types/game";

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

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  camera: Camera,
  tiles: VisibleTile[],
  entities: EntityView[],
): void {
  // Clear
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  // Render tiles
  for (const tile of tiles) {
    const screenX = (tile.x - camera.x) * TILE_SIZE;
    const screenY = (tile.y - camera.y) * TILE_SIZE;

    // Skip off-screen tiles
    if (screenX < -TILE_SIZE || screenX > width || screenY < -TILE_SIZE || screenY > height) {
      continue;
    }

    const baseColor = COLORS[tile.tile_type] ?? COLORS.Floor ?? "#1a1a2e";

    if (tile.visible) {
      ctx.fillStyle = baseColor;
    } else if (tile.explored) {
      ctx.globalAlpha = EXPLORED_ALPHA;
      ctx.fillStyle = baseColor;
    } else {
      continue;
    }

    ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
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

    const color = ENTITY_COLORS[entity.entity_type] ?? "#FFFFFF";
    const glyph = ENTITY_GLYPHS[entity.glyph] ?? "?";

    ctx.fillStyle = color;
    ctx.fillText(glyph, screenX + TILE_SIZE / 2, screenY + TILE_SIZE / 2);

    // HP bar for enemies
    if (entity.entity_type === "Enemy" && entity.hp) {
      const [current, max] = entity.hp;
      const barWidth = TILE_SIZE - 4;
      const barHeight = 3;
      const barX = screenX + 2;
      const barY = screenY + TILE_SIZE - 5;
      const fillWidth = (current / max) * barWidth;

      ctx.fillStyle = "#333";
      ctx.fillRect(barX, barY, barWidth, barHeight);
      ctx.fillStyle = current / max > 0.5 ? "#44FF44" : current / max > 0.25 ? "#FFAA00" : "#FF4444";
      ctx.fillRect(barX, barY, fillWidth, barHeight);
    }
  }
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
