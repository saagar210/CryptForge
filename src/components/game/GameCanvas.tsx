import { useRef, useEffect, useCallback } from "react";
import type { GameState, GameEvent } from "../../types/game";
import { createCamera, updateCamera, renderFrame, type Camera } from "../../lib/renderer";
import { queueAnimationsFromEvents, updateAnimations, renderAnimations } from "../../lib/animations";

interface GameCanvasProps {
  gameState: GameState;
  events: GameEvent[];
}

export function GameCanvas({ gameState, events }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<Camera>(createCamera());
  const animFrameRef = useRef<number>(0);
  const prevEventsRef = useRef<GameEvent[]>([]);

  // Queue animations when events change
  useEffect(() => {
    if (events !== prevEventsRef.current && events.length > 0) {
      prevEventsRef.current = events;
      queueAnimationsFromEvents(events);
    }
  }, [events]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    updateCamera(cameraRef.current, gameState.player.position, canvas.width, canvas.height);

    renderFrame(
      ctx,
      canvas.width,
      canvas.height,
      cameraRef.current,
      gameState.visible_tiles,
      gameState.visible_entities,
    );

    // Render animations on top
    updateAnimations();
    renderAnimations(
      ctx,
      canvas.width,
      canvas.height,
      cameraRef.current.x,
      cameraRef.current.y,
      32,
      gameState.player.position,
    );

    animFrameRef.current = requestAnimationFrame(render);
  }, [gameState]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        imageRendering: "pixelated",
      }}
    />
  );
}
