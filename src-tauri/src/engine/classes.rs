use super::entity::*;

pub struct ClassTemplate {
    pub class: PlayerClass,
    pub hp: i32,
    pub attack: i32,
    pub defense: i32,
    pub speed: i32,
    pub crit_chance: f32,
    pub dodge_chance: f32,
    pub fov_radius: i32,
    pub mana: i32,
    pub max_mana: i32,
    pub starting_items: Vec<&'static str>,
}

pub fn get_class_template(class: PlayerClass) -> ClassTemplate {
    match class {
        PlayerClass::Warrior => ClassTemplate {
            class,
            hp: 60,
            attack: 7,
            defense: 4,
            speed: 90,
            crit_chance: 0.05,
            dodge_chance: 0.0,
            fov_radius: 8,
            mana: 30,
            max_mana: 30,
            starting_items: vec!["Short Sword", "Wooden Shield"],
        },
        PlayerClass::Rogue => ClassTemplate {
            class,
            hp: 40,
            attack: 5,
            defense: 2,
            speed: 120,
            crit_chance: 0.15,
            dodge_chance: 0.10,
            fov_radius: 10,
            mana: 25,
            max_mana: 25,
            starting_items: vec!["Dagger"],
        },
        PlayerClass::Mage => ClassTemplate {
            class,
            hp: 35,
            attack: 3,
            defense: 1,
            speed: 100,
            crit_chance: 0.05,
            dodge_chance: 0.0,
            fov_radius: 8,
            mana: 50,
            max_mana: 50,
            starting_items: vec!["Staff"],
        },
    }
}

pub fn get_level_up_choices(class: PlayerClass) -> Vec<LevelUpChoice> {
    let mut choices = vec![
        LevelUpChoice::MaxHp,
        LevelUpChoice::Attack,
        LevelUpChoice::Defense,
        LevelUpChoice::Speed,
    ];
    match class {
        PlayerClass::Warrior => {
            choices.push(LevelUpChoice::Cleave);
            choices.push(LevelUpChoice::Fortify);
        }
        PlayerClass::Rogue => {
            choices.push(LevelUpChoice::Backstab);
            choices.push(LevelUpChoice::Evasion);
        }
        PlayerClass::Mage => {
            choices.push(LevelUpChoice::SpellPower);
            choices.push(LevelUpChoice::ManaRegen);
        }
    }
    choices
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn warrior_template() {
        let t = get_class_template(PlayerClass::Warrior);
        assert_eq!(t.hp, 60);
        assert_eq!(t.attack, 7);
        assert_eq!(t.defense, 4);
        assert_eq!(t.speed, 90);
        assert_eq!(t.mana, 30);
        assert_eq!(t.starting_items.len(), 2);
    }

    #[test]
    fn rogue_template() {
        let t = get_class_template(PlayerClass::Rogue);
        assert_eq!(t.hp, 40);
        assert_eq!(t.speed, 120);
        assert!(t.dodge_chance > 0.0);
        assert!(t.crit_chance > 0.10);
    }

    #[test]
    fn mage_template() {
        let t = get_class_template(PlayerClass::Mage);
        assert_eq!(t.hp, 35);
        assert_eq!(t.mana, 50);
        assert_eq!(t.attack, 3);
    }

    #[test]
    fn class_level_up_choices() {
        let warrior = get_level_up_choices(PlayerClass::Warrior);
        assert!(warrior.contains(&LevelUpChoice::Cleave));
        assert!(warrior.contains(&LevelUpChoice::Fortify));
        assert!(!warrior.contains(&LevelUpChoice::Backstab));

        let rogue = get_level_up_choices(PlayerClass::Rogue);
        assert!(rogue.contains(&LevelUpChoice::Backstab));
        assert!(rogue.contains(&LevelUpChoice::Evasion));

        let mage = get_level_up_choices(PlayerClass::Mage);
        assert!(mage.contains(&LevelUpChoice::SpellPower));
        assert!(mage.contains(&LevelUpChoice::ManaRegen));
    }
}
