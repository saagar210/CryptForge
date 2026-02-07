import { useRef, useEffect } from "react";
import type { MinimapData } from "../../types/game";
import { renderMinimap } from "../../lib/renderer";

interface MinimapProps {
  data: MinimapData;
}

export function Minimap({ data }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 160;
    canvas.height = 160;

    renderMinimap(ctx, 160, 160, data.width, data.height, data.tiles, data.player_x, data.player_y);
  }, [data]);

  return (
    <div style={styles.container}>
      <canvas ref={canvasRef} style={styles.canvas} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "4px",
    backgroundColor: "#0a0a12",
    border: "1px solid #333",
  },
  canvas: {
    width: "160px",
    height: "160px",
    imageRendering: "pixelated",
  },
};
