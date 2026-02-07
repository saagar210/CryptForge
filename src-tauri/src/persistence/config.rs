use rusqlite::{Connection, params};

use crate::engine::entity::Settings;

/// Load settings from the database, using defaults for missing keys.
pub fn load_settings(conn: &Connection) -> Settings {
    let mut settings = Settings::default();

    if let Ok(v) = get_setting(conn, "tile_size") { settings.tile_size = v.parse().unwrap_or(32); }
    if let Ok(v) = get_setting(conn, "master_volume") { settings.master_volume = v.parse().unwrap_or(80); }
    if let Ok(v) = get_setting(conn, "sfx_volume") { settings.sfx_volume = v.parse().unwrap_or(80); }
    if let Ok(v) = get_setting(conn, "ambient_volume") { settings.ambient_volume = v.parse().unwrap_or(50); }
    if let Ok(v) = get_setting(conn, "fullscreen") { settings.fullscreen = v == "true"; }
    if let Ok(v) = get_setting(conn, "ollama_enabled") { settings.ollama_enabled = v == "true"; }
    if let Ok(v) = get_setting(conn, "ollama_url") { settings.ollama_url = v; }
    if let Ok(v) = get_setting(conn, "ollama_model") { settings.ollama_model = v; }
    if let Ok(v) = get_setting(conn, "ollama_timeout") { settings.ollama_timeout = v.parse().unwrap_or(3); }

    settings
}

/// Save settings to the database.
pub fn save_settings(conn: &Connection, settings: &Settings) -> Result<(), String> {
    set_setting(conn, "tile_size", &settings.tile_size.to_string())?;
    set_setting(conn, "master_volume", &settings.master_volume.to_string())?;
    set_setting(conn, "sfx_volume", &settings.sfx_volume.to_string())?;
    set_setting(conn, "ambient_volume", &settings.ambient_volume.to_string())?;
    set_setting(conn, "fullscreen", if settings.fullscreen { "true" } else { "false" })?;
    set_setting(conn, "ollama_enabled", if settings.ollama_enabled { "true" } else { "false" })?;
    set_setting(conn, "ollama_url", &settings.ollama_url)?;
    set_setting(conn, "ollama_model", &settings.ollama_model)?;
    set_setting(conn, "ollama_timeout", &settings.ollama_timeout.to_string())?;
    Ok(())
}

fn get_setting(conn: &Connection, key: &str) -> Result<String, String> {
    conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        params![key],
        |row| row.get(0),
    ).map_err(|e| format!("Get setting '{}': {}", key, e))
}

fn set_setting(conn: &Connection, key: &str, value: &str) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        params![key, value],
    ).map_err(|e| format!("Set setting '{}': {}", key, e))?;
    Ok(())
}
