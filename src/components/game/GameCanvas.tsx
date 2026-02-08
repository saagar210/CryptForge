import { useRef, useEffect, useCallback } from "react";
import type { GameState, GameEvent } from "../../types/game";
import { createCamera, updateCamera, renderFrame, clearFovAlphaMap, resetShakeState, type Camera, type HoveredTile, type TargetingState } from "../../lib/renderer";
import { queueAnimationsFromEvents, updateAnimations, renderAnimations } from "../../lib/animations";
import { updateParticles, renderParticles, queueParticlesFromEvents, queueParticlesFromStatus } from "../../lib/particles";

const TILE_SIZE = 32;

interface GameCanvasProps {
  gameState: GameState;
  events: GameEvent[];
  onCanvasClick?: (tileX: number, tileY: number) => void;
  onCanvasRightClick?: (tileX: number, tileY: number) => void;
  targeting?: TargetingState | null;
}

export function GameCanvas({ gameState, events, onCanvasClick, onCanvasRightClick, targeting }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<Camera>(createCamera());
  const animFrameRef = useRef<number>(0);
  const prevEventsRef = useRef<GameEvent[]>([]);
  const gameStateRef = useRef<GameState>(gameState);
  const hoveredTileRef = useRef<HoveredTile | null>(null);
  const targetingRef = useRef<TargetingState | null>(null);

  // Keep refs current (avoids recreating render loop on every state change)
  gameStateRef.current = gameState;
  targetingRef.current = targeting ?? null;

  // Queue animations when events change
  useEffect(() => {
    if (events !== prevEventsRef.current && events.length > 0) {
      prevEventsRef.current = events;
      // Clear FOV alpha map on floor change so tiles don't ghost from previous floor
      if (events.some((e) => typeof e === "object" && "StairsDescended" in e)) {
        clearFovAlphaMap();
        resetShakeState();
      }
      queueAnimationsFromEvents(events, gameState.visible_entities);
      queueParticlesFromEvents(events, gameState.visible_entities);
    }
  }, [events, gameState.visible_entities]);

  const pixelToTile = useCallback((pixelX: number, pixelY: number): { tileX: number; tileY: number } => {
    const cam = cameraRef.current;
    const tileX = Math.floor(pixelX / TILE_SIZE + cam.x);
    const tileY = Math.floor(pixelY / TILE_SIZE + cam.y);
    return { tileX, tileY };
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !onCanvasClick) return;
    const rect = canvas.getBoundingClientRect();
    const { tileX, tileY } = pixelToTile(e.clientX - rect.left, e.clientY - rect.top);
    onCanvasClick(tileX, tileY);
  }, [onCanvasClick, pixelToTile]);

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas || !onCanvasRightClick) return;
    const rect = canvas.getBoundingClientRect();
    const { tileX, tileY } = pixelToTile(e.clientX - rect.left, e.clientY - rect.top);
    onCanvasRightClick(tileX, tileY);
  }, [onCanvasRightClick, pixelToTile]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const { tileX, tileY } = pixelToTile(e.clientX - rect.left, e.clientY - rect.top);
    hoveredTileRef.current = { x: tileX, y: tileY };
  }, [pixelToTile]);

  const handleMouseLeave = useCallback(() => {
    hoveredTileRef.current = null;
  }, []);

  // Single render loop — created once, reads state from refs
  useEffect(() => {
    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }

      const state = gameStateRef.current;

      updateCamera(cameraRef.current, state.player.position, canvas.width, canvas.height);

      renderFrame(
        ctx,
        canvas.width,
        canvas.height,
        cameraRef.current,
        state.visible_tiles,
        state.visible_entities,
        hoveredTileRef.current,
        state.biome,
        targetingRef.current,
      );

      // Update and render particles
      queueParticlesFromStatus(state.visible_entities);
      updateParticles(1 / 60);
      renderParticles(ctx, cameraRef.current.x, cameraRef.current.y, 32);

      // Render animations on top
      updateAnimations();
      renderAnimations(
        ctx,
        canvas.width,
        canvas.height,
        cameraRef.current.x,
        cameraRef.current.y,
        32,
        state.player.position,
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        imageRendering: "pixelated",
        cursor: "crosshair",
      }}
    />
  );
}
