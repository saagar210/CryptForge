import { useRef, useEffect } from "react";
import type { LogMessage } from "../../types/game";

interface MessageLogProps {
  messages: LogMessage[];
}

const SEVERITY_COLORS: Record<string, string> = {
  Info: "#888",
  Warning: "#FFAA00",
  Danger: "#FF4444",
  Good: "#44FF44",
};

export function MessageLog({ messages }: MessageLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [messages]);

  return (
    <div ref={scrollRef} style={styles.container}>
      {messages.map((msg, i) => (
        <div key={i} style={{ color: SEVERITY_COLORS[msg.severity] ?? "#888", fontSize: "12px", lineHeight: "1.4" }}>
          {msg.text}
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "6px 8px",
    backgroundColor: "#0a0a12",
    borderTop: "1px solid #333",
    fontFamily: "monospace",
    maxHeight: "120px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
  },
};
