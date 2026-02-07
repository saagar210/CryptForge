/**
 * Tileset system — supports both ASCII glyph rendering (default) and sprite sheet rendering.
 *
 * To add a sprite sheet tileset:
 * 1. Place sprite sheet PNGs in src/assets/tilesets/
 * 2. Define sprite coordinates in SPRITE_MAP below
 * 3. Call loadTileset() with the sheet path
 *
 * Currently uses the ASCII glyph renderer from renderer.ts as the default.
 */

export interface SpriteCoord {
  sx: number; // source x on sprite sheet
  sy: number; // source y on sprite sheet
  sw: number; // source width
  sh: number; // source height
}

export interface Tileset {
  type: "ascii" | "sprite";
  image?: HTMLImageElement;
  tileSize: number;
  getTileSprite?: (tileType: string) => SpriteCoord | null;
  getEntitySprite?: (glyphCode: number) => SpriteCoord | null;
}

// Current tileset state
let currentTileset: Tileset = {
  type: "ascii",
  tileSize: 32,
};

export function getCurrentTileset(): Tileset {
  return currentTileset;
}

export function isSpriteTileset(): boolean {
  return currentTileset.type === "sprite" && currentTileset.image !== undefined;
}

/**
 * Load a sprite sheet tileset.
 * @param imagePath Path to the sprite sheet image
 * @param sourceSize Size of each tile in the source sheet (e.g. 16 for DawnLike)
 */
export async function loadTileset(imagePath: string, sourceSize: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      currentTileset = {
        type: "sprite",
        image: img,
        tileSize: sourceSize,
        getTileSprite: (tileType: string) => TILE_SPRITES[tileType] ?? null,
        getEntitySprite: (glyphCode: number) => ENTITY_SPRITES[glyphCode] ?? null,
      };
      resolve();
    };
    img.onerror = () => reject(new Error(`Failed to load tileset: ${imagePath}`));
    img.src = imagePath;
  });
}

export function resetToAscii(): void {
  currentTileset = { type: "ascii", tileSize: 32 };
}

// Sprite coordinate maps — fill these in when a sprite sheet is available
// Coordinates are in source pixels on the sprite sheet

const TILE_SPRITES: Record<string, SpriteCoord> = {
  // Example: Wall: { sx: 0, sy: 0, sw: 16, sh: 16 },
  // Example: Floor: { sx: 16, sy: 0, sw: 16, sh: 16 },
};

const ENTITY_SPRITES: Record<number, SpriteCoord> = {
  // Example: 0x40: { sx: 0, sy: 16, sw: 16, sh: 16 }, // @  Player
  // Example: 0x67: { sx: 16, sy: 16, sw: 16, sh: 16 }, // g  Goblin
};

/**
 * Draw a sprite from the tileset to the canvas.
 * Used by the renderer when sprite mode is active.
 */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: SpriteCoord,
  destX: number,
  destY: number,
  destSize: number,
): void {
  const ts = currentTileset;
  if (ts.type !== "sprite" || !ts.image) return;

  // Nearest-neighbor scaling for pixel art
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    ts.image,
    sprite.sx, sprite.sy, sprite.sw, sprite.sh,
    destX, destY, destSize, destSize,
  );
}
