use super::entity::*;
use super::map::Map;
use super::pathfinding::{DijkstraMap, has_line_of_sight};

/// Action an AI entity decides to take on its turn.
#[derive(Debug, Clone)]
pub enum AIAction {
    MeleeAttack(EntityId),
    RangedAttack(EntityId),
    MoveToward(Position),
    MoveAway(Position),
    MoveRandom,
    Wait,
}

/// Given an entity's state and the world context, decide what action to take.
pub fn decide_action(
    entity: &Entity,
    player: &Entity,
    dijkstra: &Option<DijkstraMap>,
    map: &Map,
    entities: &[Entity],
) -> AIAction {
    let player_pos = player.position;
    let entity_pos = entity.position;

    // Check if entity can see the player
    let can_see_player = entity
        .fov
        .as_ref()
        .map(|f| f.visible_tiles.contains(&player_pos))
        .unwrap_or(false);

    // Check if confused
    let is_confused = entity
        .status_effects
        .iter()
        .any(|s| s.effect_type == StatusType::Confused);

    if is_confused {
        return AIAction::MoveRandom;
    }

    if !can_see_player {
        return AIAction::Wait;
    }

    let distance = entity_pos.chebyshev_distance(&player_pos);
    let hp_pct = entity
        .health
        .as_ref()
        .map(|h| h.current as f32 / h.max as f32)
        .unwrap_or(1.0);

    match &entity.ai {
        Some(AIBehavior::Melee) => decide_melee(entity, player_pos, distance, hp_pct, dijkstra, map, entities),
        Some(AIBehavior::Ranged { range, preferred_distance }) => {
            decide_ranged(entity, player, distance, *range, *preferred_distance, hp_pct, dijkstra, map, entities)
        }
        Some(AIBehavior::Passive) => AIAction::Wait,
        Some(AIBehavior::Fleeing) => decide_flee(entity, dijkstra, map, entities),
        Some(AIBehavior::Boss(phase)) => decide_boss(entity, player, *phase, distance, hp_pct, dijkstra, map, entities),
        None => AIAction::Wait,
    }
}

fn decide_melee(
    entity: &Entity,
    _player_pos: Position,
    distance: i32,
    hp_pct: f32,
    dijkstra: &Option<DijkstraMap>,
    map: &Map,
    entities: &[Entity],
) -> AIAction {
    // Flee if HP < 25% (non-boss melee enemies)
    if hp_pct < 0.25 {
        if let Some(flee_pos) = flee_position(entity.position, dijkstra, map, entities, entity.id) {
            return AIAction::MoveAway(flee_pos);
        }
    }

    if distance <= 1 {
        return AIAction::MeleeAttack(0); // Player id
    }

    // Move toward player
    if let Some(next_pos) = toward_position(entity.position, dijkstra, map, entities, entity.id) {
        AIAction::MoveToward(next_pos)
    } else {
        AIAction::Wait
    }
}

fn decide_ranged(
    entity: &Entity,
    player: &Entity,
    distance: i32,
    range: i32,
    preferred_distance: i32,
    hp_pct: f32,
    dijkstra: &Option<DijkstraMap>,
    map: &Map,
    entities: &[Entity],
) -> AIAction {
    // Flee if HP < 20% for ranged
    if hp_pct < 0.20 {
        if let Some(flee_pos) = flee_position(entity.position, dijkstra, map, entities, entity.id) {
            return AIAction::MoveAway(flee_pos);
        }
    }

    if distance <= 1 {
        // Adjacent: melee attack (desperate)
        return AIAction::MeleeAttack(0);
    }

    if distance <= range && has_line_of_sight(map, entity.position, player.position) {
        if distance < preferred_distance {
            // Too close, try to maintain distance
            if let Some(flee_pos) = flee_position(entity.position, dijkstra, map, entities, entity.id) {
                return AIAction::MoveAway(flee_pos);
            }
        }
        // In range with LOS: ranged attack
        return AIAction::RangedAttack(0);
    }

    // Out of range or no LOS: move closer
    if let Some(next_pos) = toward_position(entity.position, dijkstra, map, entities, entity.id) {
        AIAction::MoveToward(next_pos)
    } else {
        AIAction::Wait
    }
}

fn decide_flee(
    entity: &Entity,
    dijkstra: &Option<DijkstraMap>,
    map: &Map,
    entities: &[Entity],
) -> AIAction {
    if let Some(flee_pos) = flee_position(entity.position, dijkstra, map, entities, entity.id) {
        AIAction::MoveAway(flee_pos)
    } else {
        AIAction::Wait
    }
}

fn decide_boss(
    entity: &Entity,
    _player: &Entity,
    phase: BossPhase,
    distance: i32,
    hp_pct: f32,
    dijkstra: &Option<DijkstraMap>,
    map: &Map,
    entities: &[Entity],
) -> AIAction {
    // Phase transition check (< 50% HP triggers Phase2)
    // The actual phase transition is handled in state.rs when processing the action
    let _effective_phase = if hp_pct < 0.5 { BossPhase::Phase2 } else { phase };

    // Bosses always try to attack
    if distance <= 1 {
        return AIAction::MeleeAttack(0);
    }

    // Boss with ranged capability (e.g., The Lich teleports when adjacent)
    // For now, all bosses are melee-focused
    if let Some(next_pos) = toward_position(entity.position, dijkstra, map, entities, entity.id) {
        AIAction::MoveToward(next_pos)
    } else {
        AIAction::Wait
    }
}

/// Switch passive AI to melee when damaged.
pub fn activate_passive(entity: &mut Entity) {
    if let Some(AIBehavior::Passive) = &entity.ai {
        entity.ai = Some(AIBehavior::Melee);
    }
}

/// Check and update boss phase based on HP.
pub fn check_boss_phase(entity: &mut Entity) -> bool {
    let hp_pct = entity
        .health
        .as_ref()
        .map(|h| h.current as f32 / h.max as f32)
        .unwrap_or(1.0);

    if let Some(AIBehavior::Boss(ref mut phase)) = entity.ai {
        if hp_pct < 0.5 && *phase == BossPhase::Phase1 {
            *phase = BossPhase::Phase2;
            return true;
        }
    }
    false
}

// --- Movement helpers ---

fn toward_position(
    pos: Position,
    dijkstra: &Option<DijkstraMap>,
    map: &Map,
    entities: &[Entity],
    self_id: EntityId,
) -> Option<Position> {
    let dijkstra = dijkstra.as_ref()?;
    let next = dijkstra.best_neighbor(pos, map)?;
    if !is_blocked_by_entity(next, entities, self_id) {
        Some(next)
    } else {
        None
    }
}

fn flee_position(
    pos: Position,
    dijkstra: &Option<DijkstraMap>,
    map: &Map,
    entities: &[Entity],
    self_id: EntityId,
) -> Option<Position> {
    let dijkstra = dijkstra.as_ref()?;
    let next = dijkstra.flee_neighbor(pos, map)?;
    if !is_blocked_by_entity(next, entities, self_id) {
        Some(next)
    } else {
        None
    }
}

fn is_blocked_by_entity(pos: Position, entities: &[Entity], self_id: EntityId) -> bool {
    entities
        .iter()
        .any(|e| e.position == pos && e.blocks_movement && e.id != self_id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::engine::map::TileType;
    use std::collections::HashSet;

    fn make_open_map() -> Map {
        let mut map = Map::new(20, 20);
        for y in 0..20i32 {
            for x in 0..20i32 {
                if x == 0 || y == 0 || x == 19 || y == 19 {
                    map.set_tile(x, y, TileType::Wall);
                } else {
                    map.set_tile(x, y, TileType::Floor);
                }
            }
        }
        map
    }

    fn make_entity_with_ai(id: EntityId, pos: Position, ai: AIBehavior, hp: i32, max_hp: i32) -> Entity {
        let mut fov_tiles = HashSet::new();
        // Give it visibility of a wide area
        for dy in -8..=8 {
            for dx in -8..=8 {
                fov_tiles.insert(Position::new(pos.x + dx, pos.y + dy));
            }
        }

        Entity {
            id,
            name: "Test".to_string(),
            position: pos,
            glyph: 0x67,
            render_order: RenderOrder::Enemy,
            blocks_movement: true,
            blocks_fov: false,
            health: Some(Health { current: hp, max: max_hp }),
            combat: Some(CombatStats {
                base_attack: 5,
                base_defense: 2,
                base_speed: 100,
                crit_chance: 0.05,
            }),
            ai: Some(ai),
            inventory: None,
            equipment: None,
            item: None,
            status_effects: Vec::new(),
            fov: Some(FieldOfView {
                radius: 8,
                visible_tiles: fov_tiles,
                dirty: false,
            }),
            door: None,
            trap: None,
            stair: None,
            loot_table: None,
            flavor_text: None,
        }
    }

    fn make_player_entity(pos: Position) -> Entity {
        Entity {
            id: 0,
            name: "Player".to_string(),
            position: pos,
            glyph: 0x40,
            render_order: RenderOrder::Player,
            blocks_movement: true,
            blocks_fov: false,
            health: Some(Health::new(50)),
            combat: Some(CombatStats {
                base_attack: 5,
                base_defense: 2,
                base_speed: 100,
                crit_chance: 0.05,
            }),
            ai: None,
            inventory: None,
            equipment: None,
            item: None,
            status_effects: Vec::new(),
            fov: None,
            door: None,
            trap: None,
            stair: None,
            loot_table: None,
            flavor_text: None,
        }
    }

    #[test]
    fn melee_attacks_when_adjacent() {
        let map = make_open_map();
        let player = make_player_entity(Position::new(10, 10));
        let enemy = make_entity_with_ai(1, Position::new(11, 10), AIBehavior::Melee, 20, 20);
        let entities = vec![player.clone(), enemy.clone()];
        let dijkstra = Some(DijkstraMap::compute(&map, &[player.position]));

        let action = decide_action(&enemy, &player, &dijkstra, &map, &entities);
        assert!(matches!(action, AIAction::MeleeAttack(_)));
    }

    #[test]
    fn melee_moves_toward_player() {
        let map = make_open_map();
        let player = make_player_entity(Position::new(10, 10));
        let enemy = make_entity_with_ai(1, Position::new(15, 10), AIBehavior::Melee, 20, 20);
        let entities = vec![player.clone(), enemy.clone()];
        let dijkstra = Some(DijkstraMap::compute(&map, &[player.position]));

        let action = decide_action(&enemy, &player, &dijkstra, &map, &entities);
        match action {
            AIAction::MoveToward(pos) => {
                // Should move closer to player
                assert!(pos.chebyshev_distance(&player.position) < enemy.position.chebyshev_distance(&player.position));
            }
            _ => panic!("Expected MoveToward, got {:?}", action),
        }
    }

    #[test]
    fn melee_flees_at_low_hp() {
        let map = make_open_map();
        let player = make_player_entity(Position::new(10, 10));
        let enemy = make_entity_with_ai(1, Position::new(12, 10), AIBehavior::Melee, 3, 20); // 15% HP
        let entities = vec![player.clone(), enemy.clone()];
        let dijkstra = Some(DijkstraMap::compute(&map, &[player.position]));

        let action = decide_action(&enemy, &player, &dijkstra, &map, &entities);
        assert!(matches!(action, AIAction::MoveAway(_)));
    }

    #[test]
    fn ranged_attacks_at_range() {
        let map = make_open_map();
        let player = make_player_entity(Position::new(10, 10));
        let enemy = make_entity_with_ai(
            1,
            Position::new(14, 10),
            AIBehavior::Ranged { range: 5, preferred_distance: 3 },
            20, 20,
        );
        let entities = vec![player.clone(), enemy.clone()];
        let dijkstra = Some(DijkstraMap::compute(&map, &[player.position]));

        let action = decide_action(&enemy, &player, &dijkstra, &map, &entities);
        assert!(matches!(action, AIAction::RangedAttack(_)));
    }

    #[test]
    fn passive_waits() {
        let map = make_open_map();
        let player = make_player_entity(Position::new(10, 10));
        let enemy = make_entity_with_ai(1, Position::new(11, 10), AIBehavior::Passive, 20, 20);
        let entities = vec![player.clone(), enemy.clone()];
        let dijkstra = Some(DijkstraMap::compute(&map, &[player.position]));

        let action = decide_action(&enemy, &player, &dijkstra, &map, &entities);
        assert!(matches!(action, AIAction::Wait));
    }

    #[test]
    fn confused_moves_randomly() {
        let map = make_open_map();
        let player = make_player_entity(Position::new(10, 10));
        let mut enemy = make_entity_with_ai(1, Position::new(11, 10), AIBehavior::Melee, 20, 20);
        enemy.status_effects.push(StatusEffect {
            effect_type: StatusType::Confused,
            duration: 3,
            magnitude: 0,
            source: "test".to_string(),
        });
        let entities = vec![player.clone(), enemy.clone()];
        let dijkstra = Some(DijkstraMap::compute(&map, &[player.position]));

        let action = decide_action(&enemy, &player, &dijkstra, &map, &entities);
        assert!(matches!(action, AIAction::MoveRandom));
    }

    #[test]
    fn boss_phase_transition() {
        let mut boss = make_entity_with_ai(
            1,
            Position::new(10, 10),
            AIBehavior::Boss(BossPhase::Phase1),
            30, 100, // 30% HP
        );

        let transitioned = check_boss_phase(&mut boss);
        assert!(transitioned);
        assert!(matches!(boss.ai, Some(AIBehavior::Boss(BossPhase::Phase2))));
    }

    #[test]
    fn activate_passive_switches_to_melee() {
        let mut entity = make_entity_with_ai(1, Position::new(10, 10), AIBehavior::Passive, 20, 20);
        activate_passive(&mut entity);
        assert!(matches!(entity.ai, Some(AIBehavior::Melee)));
    }
}
