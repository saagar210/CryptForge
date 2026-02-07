/**
 * Tileset system — supports both ASCII glyph rendering (default) and DawnLike sprite sheet rendering.
 *
 * DawnLike tileset (CC-BY 4.0, DragonDePlatino):
 * Place sprite sheet PNGs in src/assets/tilesets/dawnlike/
 * Required: Floor.png, Wall.png, Characters0.png, Characters1.png, Objects0.png, Objects1.png
 */

export interface SpriteCoord {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  sheet: string; // which sprite sheet to use
}

export type TilesetMode = "ascii" | "sprite";

export interface SpriteSheets {
  [key: string]: HTMLImageElement;
}

export interface Tileset {
  type: TilesetMode;
  sheets: SpriteSheets;
  sourceSize: number;
  getTileSprite: (tileType: string, wallBitmask?: number) => SpriteCoord | null;
  getEntitySprite: (glyphCode: number) => SpriteCoord | null;
}

// Biome color palettes for ASCII mode
export interface BiomePalette {
  wall: string;
  floor: string;
  wallDark: string;
  floorDark: string;
}

export const BIOME_PALETTES: Record<string, BiomePalette> = {
  Dungeon: { wall: "#333340", floor: "#1a1a2e", wallDark: "#1a1a20", floorDark: "#0d0d17" },
  Crypt:   { wall: "#3d2d4a", floor: "#1a1a28", wallDark: "#1e1628", floorDark: "#0d0d14" },
  Caves:   { wall: "#2d3d2a", floor: "#1a2a1a", wallDark: "#162016", floorDark: "#0d150d" },
  Inferno: { wall: "#4a2020", floor: "#2e1a0a", wallDark: "#281010", floorDark: "#170d05" },
  Abyss:   { wall: "#1a2040", floor: "#0a0a20", wallDark: "#0d1020", floorDark: "#050510" },
};

// Current state
let currentMode: TilesetMode = "ascii";
let sheets: SpriteSheets = {};
let sheetsLoaded = false;

export function getTilesetMode(): TilesetMode {
  return currentMode;
}

export function setTilesetMode(mode: TilesetMode): void {
  currentMode = mode;
}

export function areSheetsLoaded(): boolean {
  return sheetsLoaded;
}

export function isSpriteTileset(): boolean {
  return currentMode === "sprite" && sheetsLoaded;
}

const SHEET_NAMES = ["Floor", "Wall", "Characters0", "Characters1", "Objects0", "Objects1"];

/**
 * Load all DawnLike sprite sheets from the assets directory.
 */
export async function loadDawnLikeSheets(basePath: string): Promise<void> {
  const promises = SHEET_NAMES.map(
    (name) =>
      new Promise<[string, HTMLImageElement]>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve([name, img]);
        img.onerror = () => reject(new Error(`Failed to load: ${basePath}/${name}.png`));
        img.src = `${basePath}/${name}.png`;
      }),
  );

  const results = await Promise.all(promises);
  for (const [name, img] of results) {
    sheets[name] = img;
  }
  sheetsLoaded = true;
}

export function resetToAscii(): void {
  currentMode = "ascii";
}

// DawnLike coordinates — 16x16 tiles
// Floor.png: rows of floor variants per biome
// Wall.png: 16 auto-tile variants per biome row
// Characters: entity sprites
// Objects: item sprites

const S = 16; // source tile size

// --- Tile sprites ---
// Floor.png layout: each row is a different floor style, columns are variants
const TILE_SPRITES: Record<string, SpriteCoord> = {
  Floor:      { sx: S * 1, sy: S * 0, sw: S, sh: S, sheet: "Floor" },
  Wall:       { sx: S * 0, sy: S * 0, sw: S, sh: S, sheet: "Wall" },
  DoorClosed: { sx: S * 1, sy: S * 4, sw: S, sh: S, sheet: "Objects0" },
  DoorOpen:   { sx: S * 2, sy: S * 4, sw: S, sh: S, sheet: "Objects0" },
  DownStairs: { sx: S * 3, sy: S * 3, sw: S, sh: S, sheet: "Objects0" },
  UpStairs:   { sx: S * 4, sy: S * 3, sw: S, sh: S, sheet: "Objects0" },
};

// Wall auto-tiling: 4-bit bitmask (N, E, S, W adjacent walls) → sprite col
// Each row in Wall.png has 16 variants matching the bitmask
const WALL_AUTOTILE: Record<number, { sx: number; sy: number }> = {};
for (let mask = 0; mask < 16; mask++) {
  WALL_AUTOTILE[mask] = { sx: mask * S, sy: 0 };
}

// --- Entity sprites ---
// Characters0.png layout: rows of character types
const ENTITY_SPRITES: Record<number, SpriteCoord> = {
  0x40: { sx: S * 0, sy: S * 0, sw: S, sh: S, sheet: "Characters0" },  // @ Player
  0x67: { sx: S * 1, sy: S * 3, sw: S, sh: S, sheet: "Characters0" },  // g goblin
  0x72: { sx: S * 3, sy: S * 6, sw: S, sh: S, sheet: "Characters0" },  // r rat
  0x73: { sx: S * 0, sy: S * 6, sw: S, sh: S, sheet: "Characters0" },  // s skeleton
  0x6F: { sx: S * 2, sy: S * 3, sw: S, sh: S, sheet: "Characters0" },  // o orc
  0x6D: { sx: S * 0, sy: S * 5, sw: S, sh: S, sheet: "Characters1" },  // m mage
  0x54: { sx: S * 3, sy: S * 4, sw: S, sh: S, sheet: "Characters0" },  // T troll
  0x56: { sx: S * 1, sy: S * 7, sw: S, sh: S, sheet: "Characters1" },  // V vampire
  0x4D: { sx: S * 4, sy: S * 5, sw: S, sh: S, sheet: "Characters1" },  // M mimic
  0x57: { sx: S * 2, sy: S * 7, sw: S, sh: S, sheet: "Characters1" },  // W wraith
  0x46: { sx: S * 0, sy: S * 8, sw: S, sh: S, sheet: "Characters1" },  // F fire elem
  0x49: { sx: S * 1, sy: S * 8, sw: S, sh: S, sheet: "Characters1" },  // I ice golem
  0x53: { sx: S * 3, sy: S * 7, sw: S, sh: S, sheet: "Characters1" },  // S shadow
  0x4E: { sx: S * 2, sy: S * 5, sw: S, sh: S, sheet: "Characters1" },  // N necromancer
  0x47: { sx: S * 4, sy: S * 3, sw: S, sh: S, sheet: "Characters0" },  // G Goblin King
  0x42: { sx: S * 0, sy: S * 9, sw: S, sh: S, sheet: "Characters1" },  // B boss
  0x4C: { sx: S * 3, sy: S * 5, sw: S, sh: S, sheet: "Characters1" },  // L Lich
  // Items
  0x2F: { sx: S * 0, sy: S * 0, sw: S, sh: S, sheet: "Objects0" },  // / weapon
  0x5B: { sx: S * 0, sy: S * 1, sw: S, sh: S, sheet: "Objects0" },  // [ armor
  0x29: { sx: S * 1, sy: S * 1, sw: S, sh: S, sheet: "Objects0" },  // ) shield
  0x3D: { sx: S * 0, sy: S * 2, sw: S, sh: S, sheet: "Objects0" },  // = ring
  0x22: { sx: S * 1, sy: S * 2, sw: S, sh: S, sheet: "Objects0" },  // " amulet
  0x21: { sx: S * 0, sy: S * 3, sw: S, sh: S, sheet: "Objects1" },  // ! potion
  0x3F: { sx: S * 1, sy: S * 3, sw: S, sh: S, sheet: "Objects1" },  // ? scroll
  0x2D: { sx: S * 2, sy: S * 3, sw: S, sh: S, sheet: "Objects1" },  // - wand
  0x25: { sx: S * 3, sy: S * 0, sw: S, sh: S, sheet: "Objects1" },  // % food
  0x7E: { sx: S * 4, sy: S * 2, sw: S, sh: S, sheet: "Objects0" },  // ~ key
  0x5E: { sx: S * 2, sy: S * 2, sw: S, sh: S, sheet: "Objects0" },  // ^ trap
  0x3E: { sx: S * 3, sy: S * 3, sw: S, sh: S, sheet: "Objects0" },  // > stairs down
  0x3C: { sx: S * 4, sy: S * 3, sw: S, sh: S, sheet: "Objects0" },  // < stairs up
  // Interactive objects (for Feature 9)
  0x6F62: { sx: S * 0, sy: S * 5, sw: S, sh: S, sheet: "Objects0" }, // barrel
  0x2F6C: { sx: S * 1, sy: S * 5, sw: S, sh: S, sheet: "Objects0" }, // lever
  0x7E66: { sx: S * 2, sy: S * 5, sw: S, sh: S, sheet: "Objects0" }, // fountain
  0x3D63: { sx: S * 3, sy: S * 5, sw: S, sh: S, sheet: "Objects0" }, // chest
  0x2B61: { sx: S * 4, sy: S * 5, sw: S, sh: S, sheet: "Objects0" }, // altar
  // Shopkeeper (for Feature 8)
  0x24: { sx: S * 5, sy: S * 3, sw: S, sh: S, sheet: "Characters0" }, // $ shopkeeper
};

export function getTileSprite(tileType: string, _wallBitmask?: number): SpriteCoord | null {
  if (!sheetsLoaded) return null;
  return TILE_SPRITES[tileType] ?? null;
}

export function getEntitySprite(glyphCode: number): SpriteCoord | null {
  if (!sheetsLoaded) return null;
  return ENTITY_SPRITES[glyphCode] ?? null;
}

/**
 * Draw a sprite from the appropriate sprite sheet to the canvas.
 */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: SpriteCoord,
  destX: number,
  destY: number,
  destSize: number,
): void {
  const sheet = sheets[sprite.sheet];
  if (!sheet) return;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    sheet,
    sprite.sx, sprite.sy, sprite.sw, sprite.sh,
    destX, destY, destSize, destSize,
  );
}
