pub mod commands;
pub mod engine;
pub mod flavor;
pub mod persistence;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::new_game,
            commands::player_action,
            commands::get_game_state,
            commands::save_game,
            commands::load_game,
            commands::inspect_entity,
            commands::get_run_history,
            commands::get_high_scores,
            commands::get_settings,
            commands::update_settings,
            commands::check_ollama,
        ])
        .run(tauri::generate_context!())
        .expect("error while running CryptForge");
}
