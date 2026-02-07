use rand::SeedableRng;
use rand::rngs::StdRng;
use rusqlite::Connection;

use crate::engine::state::World;
use super::database;

/// Save the current game world to the database.
pub fn save_world(conn: &Connection, world: &World) -> Result<(), String> {
    let data = serde_json::to_vec(world).map_err(|e| format!("Serialize error: {}", e))?;
    database::save_game_state(conn, &data, world.seed, world.floor, world.turn)
}

/// Load the game world from the database.
/// Re-seeds the RNG from seed + turn to restore determinism.
pub fn load_world(conn: &Connection) -> Result<Option<World>, String> {
    let data = database::load_game_state(conn)?;
    match data {
        Some(bytes) => {
            let mut world: World =
                serde_json::from_slice(&bytes).map_err(|e| format!("Deserialize error: {}", e))?;

            // Re-seed RNG from seed + turn for determinism
            let combined_seed = world.seed.wrapping_add(world.turn as u64);
            world.rng = StdRng::seed_from_u64(combined_seed);

            Ok(Some(world))
        }
        None => Ok(None),
    }
}

/// Delete the active save and record the run.
pub fn end_run(conn: &Connection, world: &World) -> Result<(), String> {
    let cause = if world.victory {
        None
    } else {
        Some("Slain in the dungeon")
    };

    let score = {
        let floor_score = world.floor * 100;
        let kill_score = world.enemies_killed * 10;
        let boss_score = world.bosses_killed * 500;
        let level_score = world.player_level * 50;
        let victory_bonus = if world.victory { 5000 } else { 0 };
        floor_score + kill_score + boss_score + level_score + victory_bonus
    };

    database::record_run(
        conn,
        &world.seed.to_string(),
        world.floor,
        world.enemies_killed,
        world.bosses_killed,
        world.player_level,
        world.turn,
        score,
        cause,
        world.victory,
    )?;

    database::delete_save(conn)?;
    Ok(())
}
