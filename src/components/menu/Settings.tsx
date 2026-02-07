import { useState, useEffect } from "react";
import type { Settings as SettingsType } from "../../types/game";
import { getSettings, updateSettings } from "../../lib/api";

interface SettingsProps {
  onBack: () => void;
}

const DEFAULT_SETTINGS: SettingsType = {
  tile_size: 32,
  master_volume: 80,
  sfx_volume: 80,
  ambient_volume: 50,
  fullscreen: false,
  ollama_enabled: false,
  ollama_url: "http://localhost:11434",
  ollama_model: "llama3.2",
  ollama_timeout: 3,
};

export function Settings({ onBack }: SettingsProps) {
  const [settings, setSettings] = useState<SettingsType>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then(setSettings).catch(() => {});
  }, []);

  const handleSave = async () => {
    try {
      await updateSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Save settings failed:", err);
    }
  };

  const update = <K extends keyof SettingsType>(key: K, value: SettingsType[K]) => {
    setSettings((s) => ({ ...s, [key]: value }));
    setSaved(false);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Settings</h2>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Audio</h3>
        <SliderRow label="Master Volume" value={settings.master_volume} onChange={(v) => update("master_volume", v)} />
        <SliderRow label="SFX Volume" value={settings.sfx_volume} onChange={(v) => update("sfx_volume", v)} />
        <SliderRow label="Ambient Volume" value={settings.ambient_volume} onChange={(v) => update("ambient_volume", v)} />
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Display</h3>
        <CheckRow label="Fullscreen" checked={settings.fullscreen} onChange={(v) => update("fullscreen", v)} />
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Ollama (AI Flavor Text)</h3>
        <CheckRow label="Enabled" checked={settings.ollama_enabled} onChange={(v) => update("ollama_enabled", v)} />
        <TextRow label="URL" value={settings.ollama_url} onChange={(v) => update("ollama_url", v)} />
        <TextRow label="Model" value={settings.ollama_model} onChange={(v) => update("ollama_model", v)} />
      </div>

      <div style={styles.buttons}>
        <button style={styles.btn} onClick={handleSave}>
          {saved ? "Saved!" : "Save Settings"}
        </button>
        <button style={styles.btn} onClick={onBack}>Back</button>
      </div>
    </div>
  );
}

function SliderRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={styles.row}>
      <span style={styles.label}>{label}</span>
      <input type="range" min={0} max={100} value={value} onChange={(e) => onChange(parseInt(e.target.value))} style={styles.slider} />
      <span style={styles.value}>{value}</span>
    </div>
  );
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={styles.row}>
      <span style={styles.label}>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </div>
  );
}

function TextRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={styles.row}>
      <span style={styles.label}>{label}</span>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} style={styles.textInput} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    backgroundColor: "#0a0a12",
    fontFamily: "monospace",
    color: "#ccc",
    padding: "32px",
  },
  title: {
    color: "#c0a060",
    margin: "0 0 24px",
  },
  section: {
    width: "400px",
    marginBottom: "16px",
  },
  sectionTitle: {
    color: "#888",
    fontSize: "13px",
    margin: "0 0 8px",
    borderBottom: "1px solid #222",
    paddingBottom: "4px",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "4px 0",
  },
  label: {
    minWidth: "140px",
    color: "#aaa",
    fontSize: "13px",
  },
  value: {
    minWidth: "30px",
    textAlign: "right" as const,
    color: "#888",
    fontSize: "12px",
  },
  slider: {
    flex: 1,
    accentColor: "#c0a060",
  },
  textInput: {
    flex: 1,
    padding: "4px 8px",
    backgroundColor: "#1a1a2e",
    border: "1px solid #333",
    borderRadius: "2px",
    color: "#ccc",
    fontFamily: "monospace",
    fontSize: "12px",
    outline: "none",
  },
  buttons: {
    display: "flex",
    gap: "16px",
    marginTop: "16px",
  },
  btn: {
    padding: "10px 32px",
    backgroundColor: "#1a1a2e",
    border: "1px solid #444",
    borderRadius: "4px",
    color: "#ccc",
    fontFamily: "monospace",
    fontSize: "14px",
    cursor: "pointer",
  },
};
