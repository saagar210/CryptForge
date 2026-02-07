use super::entity::*;

/// XP required to reach the next level.
pub fn xp_to_next_level(current_level: u32) -> u32 {
    current_level * 150
}

/// XP gained from killing an enemy (= enemy max HP).
pub fn xp_for_kill(enemy: &Entity) -> u32 {
    enemy.health.as_ref().map_or(0, |h| h.max as u32)
}

/// Check if the player should level up given current XP and level.
/// Returns (should_level_up, remaining_xp).
pub fn check_level_up(xp: u32, level: u32) -> (bool, u32) {
    let threshold = xp_to_next_level(level);
    if xp >= threshold {
        (true, xp - threshold)
    } else {
        (false, xp)
    }
}

/// Apply a level-up choice to the player entity.
pub fn apply_level_up_choice(entity: &mut Entity, choice: LevelUpChoice) {
    match choice {
        LevelUpChoice::MaxHp => {
            if let Some(ref mut health) = entity.health {
                health.max += 10;
                health.current += 10;
            }
        }
        LevelUpChoice::Attack => {
            if let Some(ref mut combat) = entity.combat {
                combat.base_attack += 2;
            }
        }
        LevelUpChoice::Defense => {
            if let Some(ref mut combat) = entity.combat {
                combat.base_defense += 2;
            }
        }
        LevelUpChoice::Speed => {
            if let Some(ref mut combat) = entity.combat {
                combat.base_speed += 15;
            }
        }
        LevelUpChoice::Cleave => {
            // Handled at World level (cleave_bonus)
        }
        LevelUpChoice::Fortify => {
            if let Some(ref mut combat) = entity.combat {
                combat.base_defense += 3;
            }
        }
        LevelUpChoice::Backstab => {
            if let Some(ref mut combat) = entity.combat {
                combat.crit_chance += 0.05;
            }
        }
        LevelUpChoice::Evasion => {
            if let Some(ref mut combat) = entity.combat {
                combat.dodge_chance += 0.05;
            }
        }
        LevelUpChoice::SpellPower => {
            // Handled at World level (spell_power_bonus)
        }
        LevelUpChoice::ManaRegen => {
            // Handled at World level (mana_regen)
        }
    }
}

/// Calculate score for a run.
pub fn calculate_score(
    floor: u32,
    enemies_killed: u32,
    bosses_killed: u32,
    level: u32,
    victory: bool,
) -> u32 {
    let floor_score = floor * 100;
    let kill_score = enemies_killed * 10;
    let boss_score = bosses_killed * 500;
    let level_score = level * 50;
    let victory_bonus = if victory { 5000 } else { 0 };
    floor_score + kill_score + boss_score + level_score + victory_bonus
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_player() -> Entity {
        Entity {
            id: 0,
            name: "Player".to_string(),
            position: Position::new(5, 5),
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
                dodge_chance: 0.0,
                ranged: None,
                on_hit: None,
            }),
            ai: None,
            inventory: Some(Inventory::new(20)),
            equipment: Some(EquipmentSlots::empty()),
            item: None,
            status_effects: Vec::new(),
            fov: Some(FieldOfView::new(8)),
            door: None,
            trap: None,
            stair: None,
            loot_table: None,
            flavor_text: None,
            shop: None,
            interactive: None,
            elite: None,
            resurrection_timer: None,
        }
    }

    #[test]
    fn xp_threshold_scales_with_level() {
        assert_eq!(xp_to_next_level(1), 150);
        assert_eq!(xp_to_next_level(5), 750);
        assert_eq!(xp_to_next_level(10), 1500);
    }

    #[test]
    fn level_up_triggers_at_threshold() {
        let (should, remaining) = check_level_up(200, 1);
        assert!(should);
        assert_eq!(remaining, 50); // 200 - 150
    }

    #[test]
    fn no_level_up_below_threshold() {
        let (should, remaining) = check_level_up(100, 1);
        assert!(!should);
        assert_eq!(remaining, 100);
    }

    #[test]
    fn hp_level_up() {
        let mut player = make_player();
        apply_level_up_choice(&mut player, LevelUpChoice::MaxHp);
        assert_eq!(player.health.as_ref().unwrap().max, 60);
        assert_eq!(player.health.as_ref().unwrap().current, 60);
    }

    #[test]
    fn attack_level_up() {
        let mut player = make_player();
        apply_level_up_choice(&mut player, LevelUpChoice::Attack);
        assert_eq!(player.combat.as_ref().unwrap().base_attack, 7);
    }

    #[test]
    fn defense_level_up() {
        let mut player = make_player();
        apply_level_up_choice(&mut player, LevelUpChoice::Defense);
        assert_eq!(player.combat.as_ref().unwrap().base_defense, 4);
    }

    #[test]
    fn speed_level_up() {
        let mut player = make_player();
        apply_level_up_choice(&mut player, LevelUpChoice::Speed);
        assert_eq!(player.combat.as_ref().unwrap().base_speed, 115);
    }

    #[test]
    fn score_calculation() {
        let score = calculate_score(5, 10, 1, 3, false);
        assert_eq!(score, 1250); // 500 + 100 + 500 + 150
    }

    #[test]
    fn score_with_victory() {
        let score = calculate_score(10, 50, 3, 8, true);
        // 1000 + 500 + 1500 + 400 + 5000 = 8400
        assert_eq!(score, 8400);
    }
}
