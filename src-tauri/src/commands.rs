use serde_json::Value;

#[tauri::command]
pub fn new_game(_seed: Option<String>) -> Result<Value, String> {
    Ok(serde_json::json!({"status": "not_implemented"}))
}

#[tauri::command]
pub fn player_action(_action: Value) -> Result<Value, String> {
    Ok(serde_json::json!({"status": "not_implemented"}))
}

#[tauri::command]
pub fn get_game_state() -> Result<Value, String> {
    Ok(serde_json::json!({"status": "not_implemented"}))
}

#[tauri::command]
pub fn save_game() -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub fn load_game() -> Result<Option<Value>, String> {
    Ok(None)
}

#[tauri::command]
pub fn inspect_entity(_entity_id: u32) -> Result<Value, String> {
    Ok(serde_json::json!({"status": "not_implemented"}))
}

#[tauri::command]
pub fn get_run_history() -> Result<Vec<Value>, String> {
    Ok(vec![])
}

#[tauri::command]
pub fn get_high_scores() -> Result<Vec<Value>, String> {
    Ok(vec![])
}

#[tauri::command]
pub fn get_settings() -> Result<Value, String> {
    Ok(serde_json::json!({}))
}

#[tauri::command]
pub fn update_settings(_settings: Value) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub fn check_ollama() -> Result<bool, String> {
    Ok(false)
}
