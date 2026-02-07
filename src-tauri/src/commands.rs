use std::sync::Mutex;

use rusqlite::Connection;
use tauri::State;

use crate::engine::entity::*;
use crate::engine::state::World;
use crate::persistence::{config, database, save};

pub struct AppState {
    pub world: Mutex<Option<World>>,
    pub db: Mutex<Connection>,
}

#[tauri::command]
pub fn new_game(seed: Option<String>, state: State<'_, AppState>) -> Result<TurnResult, String> {
    let seed_val: u64 = match seed {
        Some(s) if !s.is_empty() => s.parse().unwrap_or_else(|_| {
            // Hash the string to get a seed
            let mut h: u64 = 5381;
            for c in s.bytes() {
                h = h.wrapping_mul(33).wrapping_add(c as u64);
            }
            h
        }),
        _ => {
            // Random seed from system time
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_millis() as u64)
                .unwrap_or(42)
        }
    };

    let world = World::new(seed_val);
    let result = world.build_turn_result(Vec::new());

    *state.world.lock().map_err(|e| e.to_string())? = Some(world);

    Ok(result)
}

#[tauri::command]
pub fn player_action(action: PlayerAction, state: State<'_, AppState>) -> Result<TurnResult, String> {
    let mut world_lock = state.world.lock().map_err(|e| e.to_string())?;
    let world = world_lock.as_mut().ok_or("No active game")?;

    let result = world.resolve_turn(action);

    // Auto-save every 10 turns
    if world.turn % 10 == 0 && !world.game_over {
        if let Ok(db) = state.db.lock() {
            let _ = save::save_world(&db, world);
        }
    }

    // Handle game over (death or victory)
    if world.game_over || world.victory {
        if let Ok(db) = state.db.lock() {
            let _ = save::end_run(&db, world);
        }
    }

    Ok(result)
}

#[tauri::command]
pub fn get_game_state(state: State<'_, AppState>) -> Result<Option<GameState>, String> {
    let world_lock = state.world.lock().map_err(|e| e.to_string())?;
    match world_lock.as_ref() {
        Some(world) => {
            let result = world.build_turn_result(Vec::new());
            Ok(Some(result.state))
        }
        None => Ok(None),
    }
}

#[tauri::command]
pub fn save_game(state: State<'_, AppState>) -> Result<(), String> {
    let world_lock = state.world.lock().map_err(|e| e.to_string())?;
    let world = world_lock.as_ref().ok_or("No active game")?;

    if world.game_over {
        return Err("Cannot save a finished game".to_string());
    }

    let db = state.db.lock().map_err(|e| e.to_string())?;
    save::save_world(&db, world)
}

#[tauri::command]
pub fn load_game(state: State<'_, AppState>) -> Result<Option<TurnResult>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    match save::load_world(&db)? {
        Some(world) => {
            let result = world.build_turn_result(Vec::new());
            *state.world.lock().map_err(|e| e.to_string())? = Some(world);
            Ok(Some(result))
        }
        None => Ok(None),
    }
}

#[tauri::command]
pub fn inspect_entity(entity_id: u32, state: State<'_, AppState>) -> Result<Option<EntityDetail>, String> {
    let world_lock = state.world.lock().map_err(|e| e.to_string())?;
    let world = world_lock.as_ref().ok_or("No active game")?;

    let entity = match world.get_entity(entity_id) {
        Some(e) => e,
        None => return Ok(None),
    };

    // Only allow inspecting visible entities
    let player_fov = world
        .get_entity(world.player_id)
        .and_then(|p| p.fov.as_ref());

    let is_visible = entity.id == world.player_id
        || player_fov
            .map(|f| f.visible_tiles.contains(&entity.position))
            .unwrap_or(false);

    if !is_visible {
        return Ok(None);
    }

    let attack = entity.combat.as_ref().map(|_| {
        crate::engine::combat::effective_attack(entity)
    });
    let defense = entity.combat.as_ref().map(|_| {
        crate::engine::combat::effective_defense(entity)
    });

    Ok(Some(EntityDetail {
        id: entity.id,
        name: entity.name.clone(),
        entity_type: if entity.ai.is_some() {
            EntityType::Enemy
        } else if entity.id == world.player_id {
            EntityType::Player
        } else {
            EntityType::Item
        },
        hp: entity.health.as_ref().map(|h| (h.current, h.max)),
        attack,
        defense,
        status_effects: entity
            .status_effects
            .iter()
            .map(|s| StatusView {
                effect_type: s.effect_type,
                duration: s.duration,
                magnitude: s.magnitude,
            })
            .collect(),
        flavor_text: entity.flavor_text.clone(),
    }))
}

#[tauri::command]
pub fn get_run_history(state: State<'_, AppState>) -> Result<Vec<RunSummary>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    database::get_run_history(&db)
}

#[tauri::command]
pub fn get_high_scores(state: State<'_, AppState>) -> Result<Vec<HighScore>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    database::get_high_scores(&db)
}

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> Result<Settings, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    Ok(config::load_settings(&db))
}

#[tauri::command]
pub fn update_settings(settings: Settings, state: State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    config::save_settings(&db, &settings)
}

#[tauri::command]
pub fn has_save_game(state: State<'_, AppState>) -> Result<bool, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    Ok(database::has_save(&db))
}

#[tauri::command]
pub fn check_ollama(state: State<'_, AppState>) -> Result<OllamaStatus, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let settings = config::load_settings(&db);

    if !settings.ollama_enabled {
        return Ok(OllamaStatus {
            available: false,
            model_loaded: false,
            url: settings.ollama_url,
        });
    }

    // Synchronous check — just try to connect
    let url = format!("{}/api/tags", settings.ollama_url);
    let available = reqwest::blocking::get(&url).is_ok();

    Ok(OllamaStatus {
        available,
        model_loaded: available, // simplified — real check would parse the response
        url: settings.ollama_url,
    })
}
