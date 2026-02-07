use rusqlite::{Connection, params};
use std::path::Path;

#[allow(dead_code)]
const SCHEMA_VERSION: u32 = 1;

/// Open (or create) the database at the given path and run migrations.
pub fn open_database(path: &Path) -> Result<Connection, String> {
    let conn = Connection::open(path).map_err(|e| format!("Failed to open database: {}", e))?;

    // Enable WAL mode for better concurrency
    conn.execute_batch("PRAGMA journal_mode=WAL;")
        .map_err(|e| format!("Failed to set journal mode: {}", e))?;

    run_migrations(&conn)?;
    Ok(conn)
}

fn run_migrations(conn: &Connection) -> Result<(), String> {
    // Create schema_version table if it doesn't exist
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER NOT NULL
        );"
    ).map_err(|e| format!("Migration error: {}", e))?;

    let current_version: u32 = conn
        .query_row("SELECT COALESCE(MAX(version), 0) FROM schema_version", [], |row| row.get(0))
        .unwrap_or(0);

    if current_version < 1 {
        migrate_v1(conn)?;
    }

    Ok(())
}

fn migrate_v1(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS save_state (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            data BLOB NOT NULL,
            seed TEXT NOT NULL,
            floor INTEGER NOT NULL,
            turn INTEGER NOT NULL,
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            seed TEXT NOT NULL,
            floor_reached INTEGER NOT NULL,
            enemies_killed INTEGER NOT NULL,
            bosses_killed INTEGER NOT NULL,
            level_reached INTEGER NOT NULL,
            turns_taken INTEGER NOT NULL,
            score INTEGER NOT NULL,
            cause_of_death TEXT,
            victory INTEGER NOT NULL DEFAULT 0,
            timestamp TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS high_scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            score INTEGER NOT NULL,
            floor_reached INTEGER NOT NULL,
            seed TEXT NOT NULL,
            victory INTEGER NOT NULL DEFAULT 0,
            timestamp TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        INSERT OR REPLACE INTO schema_version (version) VALUES (1);"
    ).map_err(|e| format!("Migration v1 error: {}", e))?;

    Ok(())
}

/// Check if an active save exists.
pub fn has_save(conn: &Connection) -> bool {
    conn.query_row("SELECT COUNT(*) FROM save_state", [], |row| row.get::<_, i64>(0))
        .unwrap_or(0) > 0
}

/// Save game state as a BLOB.
pub fn save_game_state(conn: &Connection, data: &[u8], seed: u64, floor: u32, turn: u32) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO save_state (id, data, seed, floor, turn, updated_at)
         VALUES (1, ?1, ?2, ?3, ?4, datetime('now'))",
        params![data, seed.to_string(), floor, turn],
    ).map_err(|e| format!("Save error: {}", e))?;
    Ok(())
}

/// Load game state BLOB.
pub fn load_game_state(conn: &Connection) -> Result<Option<Vec<u8>>, String> {
    let result = conn.query_row(
        "SELECT data FROM save_state WHERE id = 1",
        [],
        |row| row.get::<_, Vec<u8>>(0),
    );

    match result {
        Ok(data) => Ok(Some(data)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Load error: {}", e)),
    }
}

/// Delete the active save (on death or victory).
pub fn delete_save(conn: &Connection) -> Result<(), String> {
    conn.execute("DELETE FROM save_state", [])
        .map_err(|e| format!("Delete save error: {}", e))?;
    Ok(())
}

/// Record a completed run.
pub fn record_run(
    conn: &Connection,
    seed: &str,
    floor_reached: u32,
    enemies_killed: u32,
    bosses_killed: u32,
    level_reached: u32,
    turns_taken: u32,
    score: u32,
    cause_of_death: Option<&str>,
    victory: bool,
) -> Result<(), String> {
    conn.execute(
        "INSERT INTO runs (seed, floor_reached, enemies_killed, bosses_killed, level_reached, turns_taken, score, cause_of_death, victory)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![seed, floor_reached, enemies_killed, bosses_killed, level_reached, turns_taken, score, cause_of_death, victory as i32],
    ).map_err(|e| format!("Record run error: {}", e))?;

    // Also insert into high_scores
    conn.execute(
        "INSERT INTO high_scores (score, floor_reached, seed, victory)
         VALUES (?1, ?2, ?3, ?4)",
        params![score, floor_reached, seed, victory as i32],
    ).map_err(|e| format!("Record high score error: {}", e))?;

    // Keep only top 10 high scores
    conn.execute(
        "DELETE FROM high_scores WHERE id NOT IN (SELECT id FROM high_scores ORDER BY score DESC LIMIT 10)",
        [],
    ).map_err(|e| format!("Prune high scores error: {}", e))?;

    Ok(())
}

/// Get top 10 high scores.
pub fn get_high_scores(conn: &Connection) -> Result<Vec<crate::engine::entity::HighScore>, String> {
    let mut stmt = conn
        .prepare("SELECT score, floor_reached, seed, victory, timestamp FROM high_scores ORDER BY score DESC LIMIT 10")
        .map_err(|e| format!("Query error: {}", e))?;

    let scores = stmt
        .query_map([], |row| {
            Ok(crate::engine::entity::HighScore {
                rank: 0, // filled in below
                score: row.get(0)?,
                floor_reached: row.get(1)?,
                seed: row.get(2)?,
                victory: row.get::<_, i32>(3)? != 0,
                timestamp: row.get(4)?,
            })
        })
        .map_err(|e| format!("Query error: {}", e))?
        .filter_map(|r| r.ok())
        .enumerate()
        .map(|(i, mut s)| {
            s.rank = (i + 1) as u32;
            s
        })
        .collect();

    Ok(scores)
}

/// Get run history (most recent 50).
pub fn get_run_history(conn: &Connection) -> Result<Vec<crate::engine::entity::RunSummary>, String> {
    let mut stmt = conn
        .prepare("SELECT seed, floor_reached, enemies_killed, bosses_killed, level_reached, turns_taken, score, cause_of_death, victory, timestamp FROM runs ORDER BY id DESC LIMIT 50")
        .map_err(|e| format!("Query error: {}", e))?;

    let runs = stmt
        .query_map([], |row| {
            Ok(crate::engine::entity::RunSummary {
                seed: row.get(0)?,
                floor_reached: row.get(1)?,
                enemies_killed: row.get(2)?,
                bosses_killed: row.get(3)?,
                level_reached: row.get(4)?,
                turns_taken: row.get(5)?,
                score: row.get(6)?,
                cause_of_death: row.get(7)?,
                victory: row.get::<_, i32>(8)? != 0,
                timestamp: row.get(9)?,
            })
        })
        .map_err(|e| format!("Query error: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(runs)
}
