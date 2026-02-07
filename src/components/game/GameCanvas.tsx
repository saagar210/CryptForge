import { useRef, useEffect } from "react";
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
  const gameStateRef = useRef<GameState>(gameState);

  // Keep gameState ref current (avoids recreating render loop on every state change)
  gameStateRef.current = gameState;

  // Queue animations when events change
  useEffect(() => {
    if (events !== prevEventsRef.current && events.length > 0) {
      prevEventsRef.current = events;
      queueAnimationsFromEvents(events, gameState.visible_entities);
    }
  }, [events, gameState.visible_entities]);

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
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        imageRendering: "pixelated",
      }}
    />
  );
}
