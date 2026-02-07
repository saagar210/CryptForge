use rand::Rng;

use super::entity::*;

/// Calculate effective attack for an entity, factoring equipment and status effects.
pub fn effective_attack(entity: &Entity) -> i32 {
    let base = entity.combat.as_ref().map_or(0, |c| c.base_attack);

    // Equipment bonus: main hand weapon power
    let weapon_bonus = equipment_attack_bonus(entity);

    // Ring of Strength bonus
    let ring_bonus = equipment_ring_bonus(entity);

    // Status modifiers
    let status_mod = status_attack_modifier(entity);

    (base + weapon_bonus + ring_bonus + status_mod).max(0)
}

/// Calculate effective defense for an entity, factoring equipment and status effects.
pub fn effective_defense(entity: &Entity) -> i32 {
    let base = entity.combat.as_ref().map_or(0, |c| c.base_defense);

    let armor_bonus = equipment_defense_bonus(entity);

    let status_mod = status_defense_modifier(entity);

    (base + armor_bonus + status_mod).max(0)
}

/// Calculate effective speed for an entity, factoring equipment and status effects.
pub fn effective_speed(entity: &Entity) -> i32 {
    let base = entity.combat.as_ref().map_or(100, |c| c.base_speed);

    let status_mod = status_speed_modifier(entity);

    (base + status_mod).max(10) // minimum speed 10 to prevent softlock
}

/// Resolve an attack between attacker and target. Returns (damage, is_crit, killed).
pub fn resolve_attack(
    attacker: &Entity,
    target: &Entity,
    rng: &mut impl Rng,
) -> AttackResult {
    let atk = effective_attack(attacker);
    let def = effective_defense(target);

    // Base damage = attack - defense
    let base_damage = (atk - def).max(0);

    // Variance: ±20%
    let variance = if base_damage > 0 {
        let range = (base_damage as f64 * 0.2).ceil() as i32;
        if range > 0 {
            rng.gen_range(-range..=range)
        } else {
            0
        }
    } else {
        0
    };

    let mut damage = (base_damage + variance).max(1); // minimum 1 damage

    // Crit check
    let crit_chance = attacker.combat.as_ref().map_or(0.0, |c| c.crit_chance);
    let is_crit = rng.gen::<f32>() < crit_chance;
    if is_crit {
        damage = (damage as f64 * 1.5) as i32;
    }

    let target_hp = target.health.as_ref().map_or(0, |h| h.current);
    let killed = damage >= target_hp;

    AttackResult {
        damage,
        is_crit,
        killed,
    }
}

pub struct AttackResult {
    pub damage: i32,
    pub is_crit: bool,
    pub killed: bool,
}

// --- Equipment helpers ---

fn equipment_attack_bonus(entity: &Entity) -> i32 {
    let equipment = match &entity.equipment {
        Some(e) => e,
        None => return 0,
    };
    let inventory = match &entity.inventory {
        Some(inv) => inv,
        None => return 0,
    };

    let mut bonus = 0;

    // Main hand weapon
    if let Some(weapon_id) = equipment.main_hand {
        if let Some(item) = inventory.items.iter().find(|i| i.id == weapon_id) {
            if let Some(props) = &item.item {
                if props.item_type == ItemType::Weapon {
                    bonus += props.power;
                }
            }
        }
    }

    bonus
}

fn equipment_defense_bonus(entity: &Entity) -> i32 {
    let equipment = match &entity.equipment {
        Some(e) => e,
        None => return 0,
    };
    let inventory = match &entity.inventory {
        Some(inv) => inv,
        None => return 0,
    };

    let mut bonus = 0;

    // Check all defense-granting slots
    let slots = [
        equipment.head,
        equipment.body,
        equipment.off_hand,
    ];

    for slot_id in slots.iter().flatten() {
        if let Some(item) = inventory.items.iter().find(|i| i.id == *slot_id) {
            if let Some(props) = &item.item {
                if props.item_type == ItemType::Armor || props.item_type == ItemType::Shield {
                    bonus += props.power;
                }
            }
        }
    }

    // Ring of Protection
    if let Some(ring_id) = equipment.ring {
        if let Some(item) = inventory.items.iter().find(|i| i.id == ring_id) {
            if item.name == "Ring of Protection" {
                if let Some(props) = &item.item {
                    bonus += props.power;
                }
            }
        }
    }

    bonus
}

fn equipment_ring_bonus(entity: &Entity) -> i32 {
    let equipment = match &entity.equipment {
        Some(e) => e,
        None => return 0,
    };
    let inventory = match &entity.inventory {
        Some(inv) => inv,
        None => return 0,
    };

    if let Some(ring_id) = equipment.ring {
        if let Some(item) = inventory.items.iter().find(|i| i.id == ring_id) {
            if item.name == "Ring of Strength" {
                if let Some(props) = &item.item {
                    return props.power;
                }
            }
        }
    }
    0
}

fn status_attack_modifier(entity: &Entity) -> i32 {
    let mut modifier = 0;
    for effect in &entity.status_effects {
        match effect.effect_type {
            StatusType::Weakened => modifier -= 3,
            StatusType::Strengthened => modifier += 3,
            _ => {}
        }
    }
    modifier
}

fn status_defense_modifier(entity: &Entity) -> i32 {
    let mut modifier = 0;
    for effect in &entity.status_effects {
        match effect.effect_type {
            StatusType::Weakened => modifier -= 2,
            _ => {}
        }
    }
    modifier
}

fn status_speed_modifier(entity: &Entity) -> i32 {
    let mut modifier = 0;
    for effect in &entity.status_effects {
        match effect.effect_type {
            StatusType::Hasted => modifier += 30,
            StatusType::Slowed => modifier -= 30,
            _ => {}
        }
    }
    modifier
}

#[cfg(test)]
mod tests {
    use super::*;
    use rand::SeedableRng;

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
        }
    }

    fn make_enemy(hp: i32, attack: i32, defense: i32) -> Entity {
        Entity {
            id: 1,
            name: "Enemy".to_string(),
            position: Position::new(6, 5),
            glyph: 0x67,
            render_order: RenderOrder::Enemy,
            blocks_movement: true,
            blocks_fov: false,
            health: Some(Health::new(hp)),
            combat: Some(CombatStats {
                base_attack: attack,
                base_defense: defense,
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
        }
    }

    #[test]
    fn effective_attack_base() {
        let player = make_player();
        assert_eq!(effective_attack(&player), 5);
    }

    #[test]
    fn effective_defense_base() {
        let player = make_player();
        assert_eq!(effective_defense(&player), 2);
    }

    #[test]
    fn damage_always_at_least_one() {
        let attacker = make_enemy(10, 1, 0); // 1 attack
        let target = make_enemy(50, 0, 10); // 10 defense
        let mut rng = rand::rngs::StdRng::seed_from_u64(42);

        // Even with atk(1) < def(10), damage should be at least 1
        let result = resolve_attack(&attacker, &target, &mut rng);
        assert!(result.damage >= 1);
    }

    #[test]
    fn damage_in_expected_range() {
        let attacker = make_enemy(10, 10, 0);
        let target = make_enemy(50, 0, 2);
        let mut rng = rand::rngs::StdRng::seed_from_u64(42);

        // Expected base: 10 - 2 = 8, variance ±2 (20% of 8), no crit
        let result = resolve_attack(&attacker, &target, &mut rng);
        assert!(result.damage >= 6 && result.damage <= 10, "Damage {} out of expected range 6-10", result.damage);
    }

    #[test]
    fn kill_detection() {
        let attacker = make_enemy(10, 20, 0);
        let target = make_enemy(5, 0, 0); // only 5 HP
        let mut rng = rand::rngs::StdRng::seed_from_u64(42);

        let result = resolve_attack(&attacker, &target, &mut rng);
        assert!(result.killed);
    }

    #[test]
    fn speed_with_haste() {
        let mut player = make_player();
        player.status_effects.push(StatusEffect {
            effect_type: StatusType::Hasted,
            duration: 5,
            magnitude: 0,
            source: "potion".to_string(),
        });
        assert_eq!(effective_speed(&player), 130);
    }

    #[test]
    fn speed_with_slow() {
        let mut player = make_player();
        player.status_effects.push(StatusEffect {
            effect_type: StatusType::Slowed,
            duration: 5,
            magnitude: 0,
            source: "ice".to_string(),
        });
        assert_eq!(effective_speed(&player), 70);
    }
}
