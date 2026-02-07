use std::collections::HashMap;

use rand::rngs::StdRng;
use rand::{Rng, SeedableRng};
use serde::{Deserialize, Serialize};

use super::combat;
use super::dungeon;
use super::dungeon::placement;
use super::entity::*;
use super::fov;
use super::map::{Map, TileType};
use super::pathfinding::DijkstraMap;

const ENERGY_THRESHOLD: i32 = 100;

#[derive(Serialize, Deserialize)]
pub struct World {
    pub seed: u64,
    pub floor: u32,
    pub turn: u32,
    pub map: Map,
    pub entities: Vec<Entity>,
    pub player_id: EntityId,
    pub energy: HashMap<EntityId, i32>,
    pub dijkstra: Option<DijkstraMap>,
    pub messages: Vec<LogMessage>,
    pub pending_level_up: bool,
    pub player_level: u32,
    pub player_xp: u32,
    pub enemies_killed: u32,
    pub bosses_killed: u32,
    pub game_over: bool,
    pub victory: bool,
    #[serde(with = "rng_serde")]
    pub rng: StdRng,
}

mod rng_serde {
    use rand::rngs::StdRng;
    use rand::SeedableRng;
    use serde::{self, Deserialize, Deserializer, Serializer};

    pub fn serialize<S>(_rng: &StdRng, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        // We can't easily get the internal state, so we store a placeholder.
        // On load, the RNG will be re-seeded from the seed + turn.
        serializer.serialize_u64(0)
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<StdRng, D::Error>
    where
        D: Deserializer<'de>,
    {
        // Placeholder - will be re-seeded on load
        let _: u64 = Deserialize::deserialize(deserializer)?;
        Ok(StdRng::seed_from_u64(0))
    }
}

impl World {
    pub fn new(seed: u64) -> Self {
        let floor = 1;
        let mut rng = StdRng::seed_from_u64(seed);
        let map = dungeon::generate_floor(seed, floor);

        // Find start room position for player
        let start_pos = map
            .rooms
            .iter()
            .find(|r| r.room_type == super::map::RoomType::Start)
            .map(|r| r.center())
            .unwrap_or(Position::new(1, 1));

        let player = placement::spawn_player(start_pos);
        placement::reset_id_counter();
        let mut entities = vec![player];

        // Spawn floor entities
        let floor_entities = placement::spawn_entities(&map, floor, &mut rng);
        entities.extend(floor_entities);

        // Place stairs entities
        place_stairs(&map, &mut entities);

        // Initialize energy map
        let mut energy = HashMap::new();
        for entity in &entities {
            if entity.combat.is_some() {
                energy.insert(entity.id, 0);
            }
        }

        let mut world = World {
            seed,
            floor,
            turn: 0,
            map,
            entities,
            player_id: 0,
            energy,
            dijkstra: None,
            messages: Vec::new(),
            pending_level_up: false,
            player_level: 1,
            player_xp: 0,
            enemies_killed: 0,
            bosses_killed: 0,
            game_over: false,
            victory: false,
            rng,
        };

        // Initial FOV computation
        world.recompute_fov();
        world.recompute_dijkstra();

        world.push_message("Welcome to CryptForge! Press ? for help.", LogSeverity::Info);

        world
    }

    /// Main turn resolution. Called when the player takes an action.
    pub fn resolve_turn(&mut self, action: PlayerAction) -> TurnResult {
        let mut events = Vec::new();

        if self.game_over || self.pending_level_up {
            return self.build_turn_result(events);
        }

        // 1. Resolve player action
        let player_events = self.resolve_player_action(&action);
        events.extend(player_events);

        // Check if player died from their own action (trap, etc.)
        if self.is_player_dead() {
            return self.handle_player_death(events);
        }

        // 2. Grant energy and process enemy turns
        self.turn += 1;
        let enemy_events = self.process_enemy_turns();
        events.extend(enemy_events);

        // Check if player died from enemy attacks
        if self.is_player_dead() {
            return self.handle_player_death(events);
        }

        // 3. Tick status effects
        let effect_events = self.tick_status_effects();
        events.extend(effect_events);

        // Check if player died from status effects
        if self.is_player_dead() {
            return self.handle_player_death(events);
        }

        // 4. Recompute FOV and Dijkstra
        self.recompute_fov();
        self.recompute_dijkstra();

        // 5. Check for newly spotted enemies
        let spot_events = self.check_spotted_enemies();
        events.extend(spot_events);

        self.build_turn_result(events)
    }

    fn resolve_player_action(&mut self, action: &PlayerAction) -> Vec<GameEvent> {
        let mut events = Vec::new();

        match &action.action_type {
            PlayerActionType::Move(dir) => {
                let player_pos = self.get_entity(self.player_id).unwrap().position;
                let new_pos = player_pos.apply_direction(*dir);

                // Check for bump-to-attack
                if let Some(target_id) = self.hostile_entity_at(new_pos) {
                    let attack_events = self.perform_attack(self.player_id, target_id);
                    events.extend(attack_events);
                } else if self.can_move_to(new_pos) {
                    // Check for doors
                    if let Some(door_id) = self.door_at(new_pos) {
                        let door_events = self.try_open_door(door_id);
                        events.extend(door_events);
                    } else {
                        let from = player_pos;
                        self.move_entity(self.player_id, new_pos);
                        events.push(GameEvent::Moved {
                            entity_id: self.player_id,
                            from,
                            to: new_pos,
                        });

                        // Check for traps
                        let trap_events = self.check_traps(self.player_id, new_pos);
                        events.extend(trap_events);
                    }
                } else {
                    self.push_message("You can't move there.", LogSeverity::Info);
                }
            }

            PlayerActionType::Wait => {
                self.push_message("You wait.", LogSeverity::Info);
            }

            PlayerActionType::PickUp => {
                events.extend(self.try_pickup());
            }

            PlayerActionType::UseStairs => {
                events.extend(self.try_use_stairs());
            }

            PlayerActionType::UseItem(item_idx) => {
                events.extend(self.try_use_item(*item_idx));
            }

            PlayerActionType::DropItem(item_idx) => {
                events.extend(self.try_drop_item(*item_idx));
            }

            PlayerActionType::EquipItem(item_idx) => {
                events.extend(self.try_equip_item(*item_idx));
            }

            PlayerActionType::UnequipSlot(slot) => {
                events.extend(self.try_unequip_slot(*slot));
            }

            PlayerActionType::LevelUpChoice(choice) => {
                events.extend(self.apply_level_up(*choice));
            }
        }

        events
    }

    fn perform_attack(&mut self, attacker_id: EntityId, target_id: EntityId) -> Vec<GameEvent> {
        let mut events = Vec::new();

        let attacker = self.get_entity(attacker_id).unwrap().clone();
        let target = self.get_entity(target_id).unwrap().clone();

        let result = combat::resolve_attack(&attacker, &target, &mut self.rng);

        // Apply damage
        if let Some(target_entity) = self.get_entity_mut(target_id) {
            if let Some(ref mut health) = target_entity.health {
                health.current -= result.damage;
            }
        }

        let target_name = target.name.clone();
        let attacker_name = attacker.name.clone();

        if result.is_crit {
            self.push_message(
                &format!("{} critically hits {} for {} damage!", attacker_name, target_name, result.damage),
                LogSeverity::Danger,
            );
        } else {
            self.push_message(
                &format!("{} hits {} for {} damage.", attacker_name, target_name, result.damage),
                LogSeverity::Info,
            );
        }

        events.push(GameEvent::Attacked {
            attacker_id,
            target_id,
            damage: result.damage,
            killed: result.killed,
        });

        if result.killed {
            events.extend(self.handle_entity_death(target_id));
        }

        events
    }

    fn handle_entity_death(&mut self, entity_id: EntityId) -> Vec<GameEvent> {
        let mut events = Vec::new();

        let entity = self.get_entity(entity_id).unwrap().clone();
        let entity_name = entity.name.clone();
        let is_boss = matches!(entity.ai, Some(AIBehavior::Boss(_)));

        // Grant XP to player
        if entity.ai.is_some() {
            let xp = entity.health.as_ref().map_or(0, |h| h.max as u32);
            self.player_xp += xp;
            self.enemies_killed += 1;

            if is_boss {
                self.bosses_killed += 1;
                events.push(GameEvent::BossDefeated {
                    name: entity_name.clone(),
                    floor: self.floor,
                });
                self.push_message(
                    &format!("{} has been defeated!", entity_name),
                    LogSeverity::Good,
                );

                // Check victory condition (floor 10 boss)
                if self.floor == 10 {
                    self.victory = true;
                    events.push(GameEvent::Victory);
                    self.push_message("Victory! You have conquered the dungeon!", LogSeverity::Good);
                }
            } else {
                self.push_message(
                    &format!("{} is defeated.", entity_name),
                    LogSeverity::Good,
                );
            }

            // Check level up
            let xp_to_next = self.player_level * 150;
            if self.player_xp >= xp_to_next {
                self.player_xp -= xp_to_next;
                self.player_level += 1;
                self.pending_level_up = true;
                events.push(GameEvent::LevelUp {
                    new_level: self.player_level,
                });
                self.push_message(
                    &format!("Level up! You are now level {}.", self.player_level),
                    LogSeverity::Good,
                );
            }
        }

        // Remove the dead entity
        self.remove_entity(entity_id);

        events
    }

    fn process_enemy_turns(&mut self) -> Vec<GameEvent> {
        let mut events = Vec::new();

        // Collect entities that can act
        let entity_ids: Vec<EntityId> = self
            .entities
            .iter()
            .filter(|e| e.ai.is_some() && e.combat.is_some() && e.id != self.player_id)
            .map(|e| e.id)
            .collect();

        // Grant energy to all combat entities
        for &id in &entity_ids {
            let speed = self
                .get_entity(id)
                .map(|e| combat::effective_speed(e))
                .unwrap_or(100);
            *self.energy.entry(id).or_insert(0) += speed;
        }

        // Also grant player energy (not used for action gating since player acts on input)
        let player_speed = self
            .get_entity(self.player_id)
            .map(|e| combat::effective_speed(e))
            .unwrap_or(100);
        *self.energy.entry(self.player_id).or_insert(0) += player_speed;

        // Process each enemy that has enough energy
        for &id in &entity_ids {
            if self.get_entity(id).is_none() {
                continue; // Entity was killed
            }

            let current_energy = *self.energy.get(&id).unwrap_or(&0);
            if current_energy >= ENERGY_THRESHOLD {
                *self.energy.entry(id).or_insert(0) -= ENERGY_THRESHOLD;

                // Check if stunned
                let is_stunned = self
                    .get_entity(id)
                    .map(|e| e.status_effects.iter().any(|s| s.effect_type == StatusType::Stunned))
                    .unwrap_or(false);

                if is_stunned {
                    continue;
                }

                let enemy_events = self.resolve_enemy_turn(id);
                events.extend(enemy_events);

                // Check if player died
                if self.is_player_dead() {
                    break;
                }
            }
        }

        events
    }

    fn resolve_enemy_turn(&mut self, entity_id: EntityId) -> Vec<GameEvent> {
        let mut events = Vec::new();

        let entity = match self.get_entity(entity_id) {
            Some(e) => e.clone(),
            None => return events,
        };

        let player_pos = match self.get_entity(self.player_id) {
            Some(p) => p.position,
            None => return events,
        };

        // Check if enemy can see the player
        let can_see_player = entity
            .fov
            .as_ref()
            .map(|f| f.visible_tiles.contains(&player_pos))
            .unwrap_or(false);

        if !can_see_player {
            return events;
        }

        let distance = entity.position.chebyshev_distance(&player_pos);

        match &entity.ai {
            Some(AIBehavior::Melee) => {
                if distance <= 1 {
                    // Adjacent: attack
                    events.extend(self.perform_attack(entity_id, self.player_id));
                } else {
                    // Move toward player using Dijkstra
                    events.extend(self.move_toward_player(entity_id));
                }
            }
            Some(AIBehavior::Ranged { range, preferred_distance }) => {
                let range = *range;
                let preferred = *preferred_distance;

                if distance <= 1 {
                    // Too close, attack
                    events.extend(self.perform_attack(entity_id, self.player_id));
                } else if distance <= range {
                    if distance < preferred {
                        // Too close for comfort, try to retreat
                        events.extend(self.move_away_from_player(entity_id));
                    } else {
                        // In range, attack (ranged attack = melee for now, AI task will refine)
                        events.extend(self.perform_attack(entity_id, self.player_id));
                    }
                } else {
                    // Out of range, move closer
                    events.extend(self.move_toward_player(entity_id));
                }
            }
            Some(AIBehavior::Passive) => {
                // Do nothing unless attacked (handled elsewhere when switching to Melee)
            }
            Some(AIBehavior::Fleeing) => {
                events.extend(self.move_away_from_player(entity_id));
            }
            Some(AIBehavior::Boss(_phase)) => {
                // Basic boss behavior (enhanced in AI task)
                if distance <= 1 {
                    events.extend(self.perform_attack(entity_id, self.player_id));
                } else {
                    events.extend(self.move_toward_player(entity_id));
                }
            }
            None => {}
        }

        events
    }

    fn move_toward_player(&mut self, entity_id: EntityId) -> Vec<GameEvent> {
        let mut events = Vec::new();

        let entity_pos = match self.get_entity(entity_id) {
            Some(e) => e.position,
            None => return events,
        };

        if let Some(ref dijkstra) = self.dijkstra {
            if let Some(next_pos) = dijkstra.best_neighbor(entity_pos, &self.map) {
                if !self.is_blocked(next_pos, entity_id) {
                    let from = entity_pos;
                    self.move_entity(entity_id, next_pos);
                    events.push(GameEvent::Moved {
                        entity_id,
                        from,
                        to: next_pos,
                    });
                }
            }
        }

        events
    }

    fn move_away_from_player(&mut self, entity_id: EntityId) -> Vec<GameEvent> {
        let mut events = Vec::new();

        let entity_pos = match self.get_entity(entity_id) {
            Some(e) => e.position,
            None => return events,
        };

        if let Some(ref dijkstra) = self.dijkstra {
            if let Some(next_pos) = dijkstra.flee_neighbor(entity_pos, &self.map) {
                if !self.is_blocked(next_pos, entity_id) {
                    let from = entity_pos;
                    self.move_entity(entity_id, next_pos);
                    events.push(GameEvent::Moved {
                        entity_id,
                        from,
                        to: next_pos,
                    });
                }
            }
        }

        events
    }

    fn tick_status_effects(&mut self) -> Vec<GameEvent> {
        let mut events = Vec::new();
        let entity_ids: Vec<EntityId> = self.entities.iter().map(|e| e.id).collect();

        for id in entity_ids {
            let effects: Vec<StatusEffect> = self
                .get_entity(id)
                .map(|e| e.status_effects.clone())
                .unwrap_or_default();

            for effect in &effects {
                match effect.effect_type {
                    StatusType::Poison => {
                        let damage = effect.magnitude.max(2);
                        if let Some(entity) = self.get_entity_mut(id) {
                            if let Some(ref mut health) = entity.health {
                                health.current -= damage;
                            }
                        }
                        let name = self.get_entity(id).map(|e| e.name.clone()).unwrap_or_default();
                        events.push(GameEvent::DamageTaken {
                            entity_id: id,
                            amount: damage,
                            source: "poison".to_string(),
                        });
                        self.push_message(
                            &format!("{} takes {} poison damage.", name, damage),
                            LogSeverity::Warning,
                        );
                    }
                    StatusType::Burning => {
                        let damage = effect.magnitude.max(3);
                        if let Some(entity) = self.get_entity_mut(id) {
                            if let Some(ref mut health) = entity.health {
                                health.current -= damage;
                            }
                        }
                        let name = self.get_entity(id).map(|e| e.name.clone()).unwrap_or_default();
                        events.push(GameEvent::DamageTaken {
                            entity_id: id,
                            amount: damage,
                            source: "fire".to_string(),
                        });
                        self.push_message(
                            &format!("{} takes {} fire damage.", name, damage),
                            LogSeverity::Warning,
                        );
                    }
                    StatusType::Regenerating => {
                        let heal = effect.magnitude.max(2);
                        if let Some(entity) = self.get_entity_mut(id) {
                            if let Some(ref mut health) = entity.health {
                                health.current = (health.current + heal).min(health.max);
                            }
                        }
                        events.push(GameEvent::Healed {
                            entity_id: id,
                            amount: heal,
                        });
                    }
                    _ => {}
                }
            }

            // Decrement durations and remove expired
            if let Some(entity) = self.get_entity_mut(id) {
                let mut expired = Vec::new();
                for effect in &mut entity.status_effects {
                    if effect.duration > 0 {
                        effect.duration -= 1;
                        if effect.duration == 0 {
                            expired.push(effect.effect_type);
                        }
                    }
                }
                entity.status_effects.retain(|e| e.duration > 0);

                for effect_type in expired {
                    events.push(GameEvent::StatusExpired {
                        entity_id: id,
                        effect: effect_type,
                    });
                }
            }
        }

        events
    }

    fn check_spotted_enemies(&self) -> Vec<GameEvent> {
        let mut events = Vec::new();

        let player_fov = self
            .get_entity(self.player_id)
            .and_then(|e| e.fov.as_ref())
            .map(|f| &f.visible_tiles);

        if let Some(visible) = player_fov {
            for entity in &self.entities {
                if entity.ai.is_some() && visible.contains(&entity.position) {
                    // Only emit on first sight (could track, but for now always emit)
                    // The AI task can refine this
                    events.push(GameEvent::EnemySpotted {
                        entity_id: entity.id,
                        name: entity.name.clone(),
                    });
                }
            }
        }

        events
    }

    fn check_traps(&mut self, entity_id: EntityId, pos: Position) -> Vec<GameEvent> {
        let mut events = Vec::new();

        // Find trap at position
        let trap_id = self.entities.iter().find(|e| {
            e.position == pos && e.trap.is_some()
                && !e.trap.as_ref().unwrap().triggered
        }).map(|e| e.id);

        let trap_id = match trap_id {
            Some(id) => id,
            None => return events,
        };

        let trap = self.get_entity(trap_id).unwrap().clone();
        let trap_props = trap.trap.as_ref().unwrap().clone();

        // Mark trap as triggered
        if let Some(trap_entity) = self.get_entity_mut(trap_id) {
            if let Some(ref mut t) = trap_entity.trap {
                t.triggered = true;
                t.revealed = true;
            }
        }

        match &trap_props.trap_type {
            TrapType::Spike { damage } => {
                let damage = *damage;
                if let Some(entity) = self.get_entity_mut(entity_id) {
                    if let Some(ref mut health) = entity.health {
                        health.current -= damage;
                    }
                }
                events.push(GameEvent::TrapTriggered {
                    position: pos,
                    trap_type: "Spike".to_string(),
                    damage,
                });
                self.push_message(
                    &format!("A spike trap springs! {} damage!", damage),
                    LogSeverity::Danger,
                );
            }
            TrapType::Poison { damage, duration } => {
                let damage = *damage;
                let duration = *duration;
                if let Some(entity) = self.get_entity_mut(entity_id) {
                    entity.status_effects.push(StatusEffect {
                        effect_type: StatusType::Poison,
                        duration,
                        magnitude: damage,
                        source: "trap".to_string(),
                    });
                }
                events.push(GameEvent::TrapTriggered {
                    position: pos,
                    trap_type: "Poison".to_string(),
                    damage: 0,
                });
                events.push(GameEvent::StatusApplied {
                    entity_id,
                    effect: StatusType::Poison,
                    duration,
                });
                self.push_message("A poison trap activates!", LogSeverity::Danger);
            }
            TrapType::Teleport => {
                // Teleport to random floor tile
                let floor_tiles: Vec<Position> = (0..self.map.width as i32)
                    .flat_map(|x| (0..self.map.height as i32).map(move |y| Position::new(x, y)))
                    .filter(|p| self.map.get_tile(p.x, p.y) == TileType::Floor && !self.is_blocked(*p, entity_id))
                    .collect();

                if let Some(&new_pos) = floor_tiles.get(self.rng.gen_range(0..floor_tiles.len().max(1))) {
                    let from = self.get_entity(entity_id).unwrap().position;
                    self.move_entity(entity_id, new_pos);
                    events.push(GameEvent::Moved {
                        entity_id,
                        from,
                        to: new_pos,
                    });
                }
                events.push(GameEvent::TrapTriggered {
                    position: pos,
                    trap_type: "Teleport".to_string(),
                    damage: 0,
                });
                self.push_message("A teleport trap whisks you away!", LogSeverity::Warning);
            }
            TrapType::Alarm => {
                events.push(GameEvent::TrapTriggered {
                    position: pos,
                    trap_type: "Alarm".to_string(),
                    damage: 0,
                });
                self.push_message("An alarm sounds! Enemies are alerted!", LogSeverity::Danger);
                // Could alert nearby enemies - AI task can handle this
            }
        }

        events
    }

    fn try_open_door(&mut self, door_id: EntityId) -> Vec<GameEvent> {
        let mut events = Vec::new();

        let door = self.get_entity(door_id).unwrap().clone();
        let door_state = door.door.as_ref().unwrap();
        let pos = door.position;

        if door_state.locked {
            // Check if player has the right key
            let key_name = door_state.key_id.clone().unwrap_or_else(|| "Boss Key".to_string());
            let has_key = self.player_has_item(&key_name);

            if has_key {
                self.remove_player_item(&key_name);
                if let Some(d) = self.get_entity_mut(door_id) {
                    if let Some(ref mut ds) = d.door {
                        ds.locked = false;
                        ds.open = true;
                    }
                }
                self.map.set_tile(pos.x, pos.y, TileType::DoorOpen);
                events.push(GameEvent::DoorOpened { position: pos });
                self.push_message("You unlock and open the door.", LogSeverity::Good);
            } else {
                self.push_message("The door is locked. You need a key.", LogSeverity::Warning);
            }
        } else {
            if let Some(d) = self.get_entity_mut(door_id) {
                if let Some(ref mut ds) = d.door {
                    ds.open = true;
                }
            }
            self.map.set_tile(pos.x, pos.y, TileType::DoorOpen);
            events.push(GameEvent::DoorOpened { position: pos });
            self.push_message("You open the door.", LogSeverity::Info);
        }

        events
    }

    fn try_pickup(&mut self) -> Vec<GameEvent> {
        let mut events = Vec::new();

        let player_pos = self.get_entity(self.player_id).unwrap().position;

        // Find item at player position
        let item_id = self.entities.iter().find(|e| {
            e.position == player_pos && e.item.is_some() && e.id != self.player_id
        }).map(|e| e.id);

        let item_id = match item_id {
            Some(id) => id,
            None => {
                self.push_message("Nothing to pick up here.", LogSeverity::Info);
                return events;
            }
        };

        // Check inventory space
        let is_full = self
            .get_entity(self.player_id)
            .and_then(|e| e.inventory.as_ref())
            .map(|inv| inv.is_full())
            .unwrap_or(true);

        if is_full {
            self.push_message("Your inventory is full!", LogSeverity::Warning);
            return events;
        }

        // Remove from world and add to inventory
        let item_entity = self.remove_entity(item_id);
        if let Some(item) = item_entity {
            let item_view = entity_to_item_view(&item);
            self.push_message(
                &format!("You pick up the {}.", item.name),
                LogSeverity::Good,
            );
            events.push(GameEvent::ItemPickedUp {
                item: item_view,
            });

            if let Some(player) = self.get_entity_mut(self.player_id) {
                if let Some(ref mut inv) = player.inventory {
                    inv.items.push(item);
                }
            }
        }

        events
    }

    fn try_use_stairs(&mut self) -> Vec<GameEvent> {
        let mut events = Vec::new();

        let player_pos = self.get_entity(self.player_id).unwrap().position;

        let stair = self.entities.iter().find(|e| {
            e.position == player_pos && e.stair == Some(StairDirection::Down)
        });

        if stair.is_none() {
            self.push_message("There are no stairs here.", LogSeverity::Info);
            return events;
        }

        // Descend to next floor
        self.floor += 1;
        self.push_message(
            &format!("You descend to floor {}.", self.floor),
            LogSeverity::Info,
        );
        events.push(GameEvent::StairsDescended {
            new_floor: self.floor,
        });

        // Generate new floor
        self.map = dungeon::generate_floor(self.seed, self.floor);
        placement::reset_id_counter();

        // Find start room and move player there
        let start_pos = self
            .map
            .rooms
            .iter()
            .find(|r| r.room_type == super::map::RoomType::Start)
            .map(|r| r.center())
            .unwrap_or(Position::new(1, 1));

        // Keep player entity, remove everything else
        let player = self.get_entity(self.player_id).unwrap().clone();
        self.entities.clear();
        self.energy.clear();

        let mut player = player;
        player.position = start_pos;
        if let Some(ref mut f) = player.fov {
            f.dirty = true;
        }
        self.entities.push(player);

        // Spawn new floor entities
        let floor_entities = placement::spawn_entities(&self.map, self.floor, &mut self.rng);
        self.entities.extend(floor_entities);

        // Place stairs
        place_stairs(&self.map, &mut self.entities);

        // Re-init energy
        for entity in &self.entities {
            if entity.combat.is_some() {
                self.energy.insert(entity.id, 0);
            }
        }

        // Recompute FOV and Dijkstra
        self.recompute_fov();
        self.recompute_dijkstra();

        events
    }

    fn try_use_item(&mut self, item_idx: u32) -> Vec<GameEvent> {
        let mut events = Vec::new();

        let item = {
            let player = match self.get_entity(self.player_id) {
                Some(p) => p,
                None => return events,
            };
            let inv = match &player.inventory {
                Some(inv) => inv,
                None => return events,
            };
            match inv.items.get(item_idx as usize) {
                Some(item) => item.clone(),
                None => {
                    self.push_message("Invalid item.", LogSeverity::Warning);
                    return events;
                }
            }
        };

        let item_props = match &item.item {
            Some(props) => props.clone(),
            None => return events,
        };

        if !item_props.item_type.is_consumable() && item_props.item_type != ItemType::Wand {
            self.push_message("You can't use that item directly. Try equipping it.", LogSeverity::Info);
            return events;
        }

        let item_view = entity_to_item_view(&item);
        let effect_desc;

        match &item_props.effect {
            Some(ItemEffect::Heal(amount)) => {
                let amount = *amount;
                if let Some(player) = self.get_entity_mut(self.player_id) {
                    if let Some(ref mut health) = player.health {
                        let healed = amount.min(health.max - health.current);
                        health.current = (health.current + amount).min(health.max);
                        events.push(GameEvent::Healed {
                            entity_id: self.player_id,
                            amount: healed,
                        });
                    }
                }
                effect_desc = format!("healed {} HP", amount);
                self.push_message(&format!("You drink the {}. Healed {} HP.", item.name, amount), LogSeverity::Good);
            }
            Some(ItemEffect::RevealMap) => {
                self.map.reveal_all();
                effect_desc = "revealed the map".to_string();
                self.push_message("The map is revealed!", LogSeverity::Good);
            }
            Some(ItemEffect::Teleport) => {
                let floor_tiles: Vec<Position> = (0..self.map.width as i32)
                    .flat_map(|x| (0..self.map.height as i32).map(move |y| Position::new(x, y)))
                    .filter(|p| self.map.get_tile(p.x, p.y) == TileType::Floor && !self.is_blocked(*p, self.player_id))
                    .collect();

                if let Some(&new_pos) = floor_tiles.get(self.rng.gen_range(0..floor_tiles.len().max(1))) {
                    let from = self.get_entity(self.player_id).unwrap().position;
                    self.move_entity(self.player_id, new_pos);
                    events.push(GameEvent::Moved {
                        entity_id: self.player_id,
                        from,
                        to: new_pos,
                    });
                }
                effect_desc = "teleported".to_string();
                self.push_message("You are teleported!", LogSeverity::Info);
            }
            Some(ItemEffect::CureStatus) => {
                if let Some(player) = self.get_entity_mut(self.player_id) {
                    player.status_effects.retain(|s| !s.effect_type.is_negative());
                }
                effect_desc = "cured status effects".to_string();
                self.push_message("Your ailments are cured!", LogSeverity::Good);
            }
            Some(ItemEffect::ApplyStatus { effect, duration }) => {
                let effect = *effect;
                let duration = *duration;
                if let Some(player) = self.get_entity_mut(self.player_id) {
                    // Remove existing same-type effect (refresh)
                    player.status_effects.retain(|s| s.effect_type != effect);
                    player.status_effects.push(StatusEffect {
                        effect_type: effect,
                        duration,
                        magnitude: 0,
                        source: item.name.clone(),
                    });
                }
                events.push(GameEvent::StatusApplied {
                    entity_id: self.player_id,
                    effect,
                    duration,
                });
                effect_desc = format!("applied {:?}", effect);
                self.push_message(&format!("You feel the effects of the {}.", item.name), LogSeverity::Info);
            }
            Some(ItemEffect::DamageArea { damage, radius }) => {
                let damage = *damage;
                let radius = *radius;
                let player_pos = self.get_entity(self.player_id).unwrap().position;

                let targets: Vec<EntityId> = self.entities.iter()
                    .filter(|e| e.ai.is_some() && e.position.chebyshev_distance(&player_pos) <= radius)
                    .map(|e| e.id)
                    .collect();

                for target_id in targets {
                    if let Some(target) = self.get_entity_mut(target_id) {
                        if let Some(ref mut health) = target.health {
                            health.current -= damage;
                        }
                    }
                    events.push(GameEvent::DamageTaken {
                        entity_id: target_id,
                        amount: damage,
                        source: "fireball".to_string(),
                    });

                    // Check death
                    let dead = self.get_entity(target_id)
                        .and_then(|e| e.health.as_ref())
                        .map(|h| h.is_dead())
                        .unwrap_or(false);
                    if dead {
                        events.extend(self.handle_entity_death(target_id));
                    }
                }

                effect_desc = format!("dealt {} damage in radius {}", damage, radius);
                self.push_message(&format!("A fireball explodes! {} damage!", damage), LogSeverity::Danger);
            }
            Some(ItemEffect::RangedAttack { damage, status }) => {
                // For wands, check charges
                let charges = item_props.charges;
                if let Some(c) = charges {
                    if c == 0 {
                        self.push_message("The wand is out of charges.", LogSeverity::Warning);
                        return events;
                    }
                }

                // Find nearest visible enemy
                let player_pos = self.get_entity(self.player_id).unwrap().position;
                let player_fov = self.get_entity(self.player_id)
                    .and_then(|e| e.fov.as_ref())
                    .map(|f| f.visible_tiles.clone())
                    .unwrap_or_default();

                let nearest_enemy = self.entities.iter()
                    .filter(|e| e.ai.is_some() && player_fov.contains(&e.position))
                    .min_by_key(|e| e.position.chebyshev_distance(&player_pos))
                    .map(|e| e.id);

                if let Some(target_id) = nearest_enemy {
                    let damage = *damage;
                    if let Some(target) = self.get_entity_mut(target_id) {
                        if let Some(ref mut health) = target.health {
                            health.current -= damage;
                        }
                    }
                    let target_name = self.get_entity(target_id).map(|e| e.name.clone()).unwrap_or_default();
                    events.push(GameEvent::DamageTaken {
                        entity_id: target_id,
                        amount: damage,
                        source: item.name.clone(),
                    });
                    self.push_message(&format!("The {} zaps {} for {} damage!", item.name, target_name, damage), LogSeverity::Info);

                    // Apply status if applicable
                    if let Some((status_type, duration)) = status {
                        if let Some(target) = self.get_entity_mut(target_id) {
                            target.status_effects.push(StatusEffect {
                                effect_type: *status_type,
                                duration: *duration,
                                magnitude: 0,
                                source: item.name.clone(),
                            });
                        }
                    }

                    let dead = self.get_entity(target_id)
                        .and_then(|e| e.health.as_ref())
                        .map(|h| h.is_dead())
                        .unwrap_or(false);
                    if dead {
                        events.extend(self.handle_entity_death(target_id));
                    }

                    // Decrement charges
                    if let Some(player) = self.get_entity_mut(self.player_id) {
                        if let Some(ref mut inv) = player.inventory {
                            if let Some(inv_item) = inv.items.iter_mut().find(|i| i.id == item.id) {
                                if let Some(ref mut props) = inv_item.item {
                                    if let Some(ref mut c) = props.charges {
                                        *c = c.saturating_sub(1);
                                    }
                                }
                            }
                        }
                    }

                    effect_desc = format!("zapped for {} damage", damage);
                } else {
                    self.push_message("No visible targets.", LogSeverity::Info);
                    return events;
                }
            }
            None => {
                self.push_message("This item has no effect.", LogSeverity::Info);
                return events;
            }
        }

        events.push(GameEvent::ItemUsed {
            item: item_view,
            effect: effect_desc,
        });

        // Remove consumable from inventory (but not wands)
        if item_props.item_type.is_consumable() {
            if let Some(player) = self.get_entity_mut(self.player_id) {
                if let Some(ref mut inv) = player.inventory {
                    inv.items.retain(|i| i.id != item.id);
                }
            }
        }

        events
    }

    fn try_drop_item(&mut self, item_idx: u32) -> Vec<GameEvent> {
        let mut events = Vec::new();

        let player_pos = self.get_entity(self.player_id).unwrap().position;

        let item = {
            let player = match self.get_entity(self.player_id) {
                Some(p) => p,
                None => return events,
            };
            let inv = match &player.inventory {
                Some(inv) => inv,
                None => return events,
            };
            match inv.items.get(item_idx as usize) {
                Some(item) => item.clone(),
                None => {
                    self.push_message("Invalid item.", LogSeverity::Warning);
                    return events;
                }
            }
        };

        let item_view = entity_to_item_view(&item);

        // Check if item is equipped
        let is_equipped = {
            let player = self.get_entity(self.player_id).unwrap();
            if let Some(equip) = &player.equipment {
                [equip.main_hand, equip.off_hand, equip.head, equip.body, equip.ring, equip.amulet]
                    .iter()
                    .any(|slot| *slot == Some(item.id))
            } else {
                false
            }
        };

        if is_equipped {
            self.push_message("Unequip the item first.", LogSeverity::Warning);
            return events;
        }

        // Remove from inventory and place on floor
        let mut dropped_item = item;
        dropped_item.position = player_pos;

        if let Some(player) = self.get_entity_mut(self.player_id) {
            if let Some(ref mut inv) = player.inventory {
                inv.items.retain(|i| i.id != dropped_item.id);
            }
        }

        self.push_message(
            &format!("You drop the {}.", dropped_item.name),
            LogSeverity::Info,
        );
        events.push(GameEvent::ItemDropped { item: item_view });

        self.entities.push(dropped_item);

        events
    }

    fn try_equip_item(&mut self, item_idx: u32) -> Vec<GameEvent> {
        let mut events = Vec::new();

        let item = {
            let player = match self.get_entity(self.player_id) {
                Some(p) => p,
                None => return events,
            };
            let inv = match &player.inventory {
                Some(inv) => inv,
                None => return events,
            };
            match inv.items.get(item_idx as usize) {
                Some(item) => item.clone(),
                None => {
                    self.push_message("Invalid item.", LogSeverity::Warning);
                    return events;
                }
            }
        };

        let item_props = match &item.item {
            Some(props) => props.clone(),
            None => return events,
        };

        let slot = match item_props.slot {
            Some(s) => s,
            None => {
                self.push_message("This item can't be equipped.", LogSeverity::Info);
                return events;
            }
        };

        let item_view = entity_to_item_view(&item);

        // Unequip current item in slot (if any)
        if let Some(player) = self.get_entity_mut(self.player_id) {
            if let Some(ref mut equip) = player.equipment {
                equip.set_slot(slot, Some(item.id));
            }
        }

        self.push_message(
            &format!("You equip the {}.", item.name),
            LogSeverity::Good,
        );
        events.push(GameEvent::ItemEquipped {
            item: item_view,
            slot,
        });

        events
    }

    fn try_unequip_slot(&mut self, slot: EquipSlot) -> Vec<GameEvent> {
        let events = Vec::new();

        let current_id = {
            let player = self.get_entity(self.player_id).unwrap();
            player.equipment.as_ref().and_then(|e| e.get_slot(slot))
        };

        match current_id {
            Some(_id) => {
                if let Some(player) = self.get_entity_mut(self.player_id) {
                    if let Some(ref mut equip) = player.equipment {
                        equip.set_slot(slot, None);
                    }
                }
                self.push_message("You unequip the item.", LogSeverity::Info);
            }
            None => {
                self.push_message("Nothing equipped in that slot.", LogSeverity::Info);
            }
        }

        events
    }

    fn apply_level_up(&mut self, choice: LevelUpChoice) -> Vec<GameEvent> {
        if !self.pending_level_up {
            return Vec::new();
        }

        self.pending_level_up = false;

        if let Some(player) = self.get_entity_mut(self.player_id) {
            match choice {
                LevelUpChoice::MaxHp => {
                    if let Some(ref mut health) = player.health {
                        health.max += 10;
                        health.current += 10;
                    }
                    self.push_message("+10 Max HP!", LogSeverity::Good);
                }
                LevelUpChoice::Attack => {
                    if let Some(ref mut combat) = player.combat {
                        combat.base_attack += 2;
                    }
                    self.push_message("+2 Attack!", LogSeverity::Good);
                }
                LevelUpChoice::Defense => {
                    if let Some(ref mut combat) = player.combat {
                        combat.base_defense += 2;
                    }
                    self.push_message("+2 Defense!", LogSeverity::Good);
                }
                LevelUpChoice::Speed => {
                    if let Some(ref mut combat) = player.combat {
                        combat.base_speed += 15;
                    }
                    self.push_message("+15 Speed!", LogSeverity::Good);
                }
            }
        }

        Vec::new()
    }

    // --- Helpers ---

    fn push_message(&mut self, text: &str, severity: LogSeverity) {
        self.messages.push(LogMessage {
            text: text.to_string(),
            turn: self.turn,
            severity,
        });
    }

    pub fn get_entity(&self, id: EntityId) -> Option<&Entity> {
        self.entities.iter().find(|e| e.id == id)
    }

    pub fn get_entity_mut(&mut self, id: EntityId) -> Option<&mut Entity> {
        self.entities.iter_mut().find(|e| e.id == id)
    }

    fn remove_entity(&mut self, id: EntityId) -> Option<Entity> {
        let idx = self.entities.iter().position(|e| e.id == id)?;
        self.energy.remove(&id);
        Some(self.entities.remove(idx))
    }

    fn move_entity(&mut self, id: EntityId, pos: Position) {
        if let Some(entity) = self.get_entity_mut(id) {
            entity.position = pos;
            if let Some(ref mut f) = entity.fov {
                f.dirty = true;
            }
        }
    }

    fn can_move_to(&self, pos: Position) -> bool {
        if !self.map.in_bounds(pos.x, pos.y) {
            return false;
        }
        if !self.map.is_walkable(pos.x, pos.y) {
            // Check if it's a closed door (walkable after opening)
            if self.map.get_tile(pos.x, pos.y) == TileType::DoorClosed {
                return true;
            }
            return false;
        }
        // Check for blocking entities
        !self.entities.iter().any(|e| e.position == pos && e.blocks_movement && e.id != self.player_id)
    }

    fn is_blocked(&self, pos: Position, self_id: EntityId) -> bool {
        if !self.map.in_bounds(pos.x, pos.y) || !self.map.is_walkable(pos.x, pos.y) {
            return true;
        }
        self.entities.iter().any(|e| e.position == pos && e.blocks_movement && e.id != self_id)
    }

    fn hostile_entity_at(&self, pos: Position) -> Option<EntityId> {
        self.entities.iter()
            .find(|e| e.position == pos && e.ai.is_some() && e.health.is_some())
            .map(|e| e.id)
    }

    fn door_at(&self, pos: Position) -> Option<EntityId> {
        self.entities.iter()
            .find(|e| e.position == pos && e.door.is_some() && !e.door.as_ref().unwrap().open)
            .map(|e| e.id)
    }

    fn is_player_dead(&self) -> bool {
        self.get_entity(self.player_id)
            .and_then(|e| e.health.as_ref())
            .map(|h| h.is_dead())
            .unwrap_or(true)
    }

    fn player_has_item(&self, name: &str) -> bool {
        self.get_entity(self.player_id)
            .and_then(|e| e.inventory.as_ref())
            .map(|inv| inv.items.iter().any(|i| i.name == name))
            .unwrap_or(false)
    }

    fn remove_player_item(&mut self, name: &str) {
        if let Some(player) = self.get_entity_mut(self.player_id) {
            if let Some(ref mut inv) = player.inventory {
                if let Some(idx) = inv.items.iter().position(|i| i.name == name) {
                    inv.items.remove(idx);
                }
            }
        }
    }

    fn recompute_fov(&mut self) {
        let entity_ids: Vec<(EntityId, Position, i32)> = self
            .entities
            .iter()
            .filter(|e| e.fov.as_ref().map(|f| f.dirty).unwrap_or(false))
            .map(|e| (e.id, e.position, e.fov.as_ref().unwrap().radius))
            .collect();

        for (id, pos, radius) in entity_ids {
            let visible = fov::compute_fov(pos, radius, &self.map);

            // If player, also reveal tiles
            if id == self.player_id {
                for p in &visible {
                    self.map.reveal(p.x, p.y);
                }
            }

            if let Some(entity) = self.get_entity_mut(id) {
                if let Some(ref mut f) = entity.fov {
                    f.visible_tiles = visible;
                    f.dirty = false;
                }
            }
        }
    }

    fn recompute_dijkstra(&mut self) {
        let player_pos = match self.get_entity(self.player_id) {
            Some(p) => p.position,
            None => return,
        };
        self.dijkstra = Some(DijkstraMap::compute(&self.map, &[player_pos]));
    }

    fn handle_player_death(&mut self, mut events: Vec<GameEvent>) -> TurnResult {
        self.game_over = true;

        let cause = "Slain in the dungeon".to_string();
        events.push(GameEvent::PlayerDied {
            cause: cause.clone(),
        });
        self.push_message("You have been slain!", LogSeverity::Danger);

        let mut result = self.build_turn_result(events);
        result.game_over = Some(GameOverInfo {
            cause_of_death: cause.clone(),
            epitaph: None,
            final_score: self.calculate_score(),
            run_summary: RunSummary {
                seed: format!("{}", self.seed),
                floor_reached: self.floor,
                enemies_killed: self.enemies_killed,
                bosses_killed: self.bosses_killed,
                level_reached: self.player_level,
                turns_taken: self.turn,
                score: self.calculate_score(),
                cause_of_death: Some(cause),
                victory: false,
                timestamp: String::new(),
            },
        });
        result
    }

    fn calculate_score(&self) -> u32 {
        let floor_score = self.floor * 100;
        let kill_score = self.enemies_killed * 10;
        let boss_score = self.bosses_killed * 500;
        let level_score = self.player_level * 50;
        let victory_bonus = if self.victory { 5000 } else { 0 };
        floor_score + kill_score + boss_score + level_score + victory_bonus
    }

    pub fn build_turn_result(&self, events: Vec<GameEvent>) -> TurnResult {
        let player = self.get_entity(self.player_id);
        let player_fov = player
            .and_then(|e| e.fov.as_ref())
            .map(|f| &f.visible_tiles);

        // Build visible tiles
        let mut visible_tiles = Vec::new();
        for y in 0..self.map.height as i32 {
            for x in 0..self.map.width as i32 {
                let idx = self.map.idx(x, y);
                let is_visible = player_fov.map(|fov| fov.contains(&Position::new(x, y))).unwrap_or(false);
                let is_explored = self.map.revealed[idx];

                if is_visible || is_explored {
                    visible_tiles.push(VisibleTile {
                        x,
                        y,
                        tile_type: self.map.tiles[idx].as_str().to_string(),
                        explored: is_explored,
                        visible: is_visible,
                    });
                }
            }
        }

        // Build visible entities
        let visible_entities: Vec<EntityView> = self
            .entities
            .iter()
            .filter(|e| {
                e.id == self.player_id
                    || player_fov.map(|fov| fov.contains(&e.position)).unwrap_or(false)
            })
            .map(|e| entity_to_view(e))
            .collect();

        // Build player state
        let player_state = self.build_player_state();

        // Build minimap
        let minimap = self.build_minimap();

        // Recent messages (last 50)
        let messages: Vec<LogMessage> = self.messages.iter().rev().take(50).cloned().collect();

        let game_over = if self.victory && !self.game_over {
            Some(GameOverInfo {
                cause_of_death: "Victory!".to_string(),
                epitaph: None,
                final_score: self.calculate_score(),
                run_summary: RunSummary {
                    seed: format!("{}", self.seed),
                    floor_reached: self.floor,
                    enemies_killed: self.enemies_killed,
                    bosses_killed: self.bosses_killed,
                    level_reached: self.player_level,
                    turns_taken: self.turn,
                    score: self.calculate_score(),
                    cause_of_death: None,
                    victory: true,
                    timestamp: String::new(),
                },
            })
        } else {
            None
        };

        TurnResult {
            state: GameState {
                player: player_state,
                visible_tiles,
                visible_entities,
                floor: self.floor,
                turn: self.turn,
                messages,
                minimap,
            },
            events,
            game_over,
        }
    }

    fn build_player_state(&self) -> PlayerState {
        let player = self.get_entity(self.player_id);

        let (hp, max_hp) = player
            .and_then(|p| p.health.as_ref())
            .map(|h| (h.current, h.max))
            .unwrap_or((0, 0));

        let (attack, defense, speed) = player
            .map(|p| {
                (
                    combat::effective_attack(p),
                    combat::effective_defense(p),
                    combat::effective_speed(p),
                )
            })
            .unwrap_or((0, 0, 100));

        let inventory = player
            .and_then(|p| p.inventory.as_ref())
            .map(|inv| inv.items.iter().map(|i| entity_to_item_view(i)).collect())
            .unwrap_or_default();

        let equipment = self.build_equipment_view();

        let status_effects = player
            .map(|p| {
                p.status_effects
                    .iter()
                    .map(|s| StatusView {
                        effect_type: s.effect_type,
                        duration: s.duration,
                        magnitude: s.magnitude,
                    })
                    .collect()
            })
            .unwrap_or_default();

        let xp_to_next = self.player_level * 150;

        PlayerState {
            position: player.map(|p| p.position).unwrap_or(Position::new(0, 0)),
            hp,
            max_hp,
            attack,
            defense,
            speed,
            level: self.player_level,
            xp: self.player_xp,
            xp_to_next,
            inventory,
            equipment,
            status_effects,
        }
    }

    fn build_equipment_view(&self) -> EquipmentView {
        let player = self.get_entity(self.player_id);
        let equip = player.and_then(|p| p.equipment.as_ref());
        let inv = player.and_then(|p| p.inventory.as_ref());

        let get_item_view = |slot_id: Option<EntityId>| -> Option<ItemView> {
            let id = slot_id?;
            let item = inv?.items.iter().find(|i| i.id == id)?;
            Some(entity_to_item_view(item))
        };

        match equip {
            Some(e) => EquipmentView {
                main_hand: get_item_view(e.main_hand),
                off_hand: get_item_view(e.off_hand),
                head: get_item_view(e.head),
                body: get_item_view(e.body),
                ring: get_item_view(e.ring),
                amulet: get_item_view(e.amulet),
            },
            None => EquipmentView {
                main_hand: None,
                off_hand: None,
                head: None,
                body: None,
                ring: None,
                amulet: None,
            },
        }
    }

    fn build_minimap(&self) -> MinimapData {
        let mut tiles = vec![0u8; self.map.width * self.map.height];

        for y in 0..self.map.height {
            for x in 0..self.map.width {
                let idx = y * self.map.width + x;
                if !self.map.revealed[idx] {
                    tiles[idx] = 0;
                } else {
                    tiles[idx] = match self.map.tiles[idx] {
                        TileType::Wall => 1,
                        TileType::Floor | TileType::DoorClosed | TileType::DoorOpen => 2,
                        TileType::DownStairs | TileType::UpStairs => 3,
                    };
                }
            }
        }

        let player_pos = self
            .get_entity(self.player_id)
            .map(|p| p.position)
            .unwrap_or(Position::new(0, 0));

        MinimapData {
            width: self.map.width,
            height: self.map.height,
            tiles,
            player_x: player_pos.x,
            player_y: player_pos.y,
        }
    }
}

fn place_stairs(map: &Map, entities: &mut Vec<Entity>) {
    // Find down stairs tile on the map and create an entity for it
    for y in 0..map.height as i32 {
        for x in 0..map.width as i32 {
            if map.get_tile(x, y) == TileType::DownStairs {
                entities.push(Entity {
                    id: placement::next_id(),
                    name: "Stairs Down".to_string(),
                    position: Position::new(x, y),
                    glyph: 0x3E, // >
                    render_order: RenderOrder::Background,
                    blocks_movement: false,
                    blocks_fov: false,
                    health: None,
                    combat: None,
                    ai: None,
                    inventory: None,
                    equipment: None,
                    item: None,
                    status_effects: Vec::new(),
                    fov: None,
                    door: None,
                    trap: None,
                    stair: Some(StairDirection::Down),
                    loot_table: None,
                    flavor_text: None,
                });
                return;
            }
        }
    }
}

fn entity_to_view(entity: &Entity) -> EntityView {
    let entity_type = if entity.id == 0 {
        EntityType::Player
    } else if entity.ai.is_some() {
        EntityType::Enemy
    } else if entity.item.is_some() {
        EntityType::Item
    } else if entity.door.is_some() {
        EntityType::Door
    } else if entity.trap.is_some() {
        EntityType::Trap
    } else if entity.stair.is_some() {
        EntityType::Stairs
    } else {
        EntityType::Item
    };

    EntityView {
        id: entity.id,
        name: entity.name.clone(),
        position: entity.position,
        entity_type,
        glyph: entity.glyph,
        hp: entity.health.as_ref().map(|h| (h.current, h.max)),
        flavor_text: entity.flavor_text.clone(),
    }
}

fn entity_to_item_view(entity: &Entity) -> ItemView {
    let item_props = entity.item.as_ref();
    ItemView {
        id: entity.id,
        name: entity.name.clone(),
        item_type: item_props.map(|p| p.item_type).unwrap_or(ItemType::Key),
        slot: item_props.and_then(|p| p.slot),
        charges: item_props.and_then(|p| p.charges),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn world_creation() {
        let world = World::new(42);
        assert_eq!(world.floor, 1);
        assert_eq!(world.turn, 0);
        assert!(!world.entities.is_empty());
        assert!(world.get_entity(0).is_some()); // Player exists
    }

    #[test]
    fn player_can_move() {
        let mut world = World::new(42);
        let initial_pos = world.get_entity(0).unwrap().position;

        // Try all 8 directions until one works
        let mut moved = false;
        for dir in &Direction::ALL {
            let new_pos = initial_pos.apply_direction(*dir);
            if world.can_move_to(new_pos) {
                let result = world.resolve_turn(PlayerAction {
                    action_type: PlayerActionType::Move(*dir),
                });
                let final_pos = world.get_entity(0).unwrap().position;
                assert_ne!(initial_pos, final_pos);
                moved = true;
                // Check that events include a Moved event
                assert!(result.events.iter().any(|e| matches!(e, GameEvent::Moved { .. })));
                break;
            }
        }
        assert!(moved, "Player should be able to move in at least one direction");
    }

    #[test]
    fn wait_advances_turn() {
        let mut world = World::new(42);
        assert_eq!(world.turn, 0);

        world.resolve_turn(PlayerAction {
            action_type: PlayerActionType::Wait,
        });
        assert_eq!(world.turn, 1);
    }

    #[test]
    fn bump_attack_damages_enemy() {
        let mut world = World::new(42);

        // Place an enemy adjacent to player
        let player_pos = world.get_entity(0).unwrap().position;
        let enemy_pos = Position::new(player_pos.x + 1, player_pos.y);

        let enemy = Entity {
            id: 999,
            name: "Test Enemy".to_string(),
            position: enemy_pos,
            glyph: 0x67,
            render_order: RenderOrder::Enemy,
            blocks_movement: true,
            blocks_fov: false,
            health: Some(Health::new(50)),
            combat: Some(CombatStats {
                base_attack: 3,
                base_defense: 0,
                base_speed: 100,
                crit_chance: 0.0,
            }),
            ai: Some(AIBehavior::Melee),
            inventory: None,
            equipment: None,
            item: None,
            status_effects: Vec::new(),
            fov: Some(FieldOfView::new(6)),
            door: None,
            trap: None,
            stair: None,
            loot_table: None,
            flavor_text: None,
        };
        world.entities.push(enemy);
        world.energy.insert(999, 0);

        // Bump attack east
        let result = world.resolve_turn(PlayerAction {
            action_type: PlayerActionType::Move(Direction::E),
        });

        // Check attack event
        assert!(result.events.iter().any(|e| matches!(e, GameEvent::Attacked { attacker_id: 0, target_id: 999, .. })));

        // Enemy should have less HP
        let enemy = world.get_entity(999).unwrap();
        assert!(enemy.health.as_ref().unwrap().current < 50);
    }

    #[test]
    fn enemy_death_grants_xp() {
        let mut world = World::new(42);

        let player_pos = world.get_entity(0).unwrap().position;
        let enemy_pos = Position::new(player_pos.x + 1, player_pos.y);

        // Make a weak enemy that will die in one hit
        let enemy = Entity {
            id: 999,
            name: "Weak Enemy".to_string(),
            position: enemy_pos,
            glyph: 0x67,
            render_order: RenderOrder::Enemy,
            blocks_movement: true,
            blocks_fov: false,
            health: Some(Health::new(1)),
            combat: Some(CombatStats {
                base_attack: 1,
                base_defense: 0,
                base_speed: 100,
                crit_chance: 0.0,
            }),
            ai: Some(AIBehavior::Melee),
            inventory: None,
            equipment: None,
            item: None,
            status_effects: Vec::new(),
            fov: Some(FieldOfView::new(6)),
            door: None,
            trap: None,
            stair: None,
            loot_table: None,
            flavor_text: None,
        };
        world.entities.push(enemy);
        world.energy.insert(999, 0);

        let initial_xp = world.player_xp;

        // Kill it
        world.resolve_turn(PlayerAction {
            action_type: PlayerActionType::Move(Direction::E),
        });

        // XP should have increased (by enemy max_hp = 1)
        assert!(world.player_xp > initial_xp);

        // Enemy should be gone
        assert!(world.get_entity(999).is_none());
        assert_eq!(world.enemies_killed, 1);
    }

    #[test]
    fn score_calculation() {
        let mut world = World::new(42);
        world.floor = 5;
        world.enemies_killed = 10;
        world.bosses_killed = 1;
        world.player_level = 3;

        let score = world.calculate_score();
        // 5*100 + 10*10 + 1*500 + 3*50 = 500 + 100 + 500 + 150 = 1250
        assert_eq!(score, 1250);
    }
}
