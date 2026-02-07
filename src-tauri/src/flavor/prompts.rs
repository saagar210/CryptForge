/// Build a prompt for generating an item description.
pub fn item_prompt(item_name: &str, item_type: &str, floor: u32) -> String {
    format!(
        "You are writing flavor text for a roguelike dungeon crawler. \
Write a single atmospheric sentence (under 30 words) describing a {} called '{}' \
found on floor {} of a dungeon. Be evocative and concise. \
Do not use quotation marks. Just the description.",
        item_type, item_name, floor
    )
}

/// Build a prompt for generating an enemy description.
pub fn enemy_prompt(enemy_name: &str, floor: u32) -> String {
    format!(
        "You are writing flavor text for a roguelike dungeon crawler. \
Write a single atmospheric sentence (under 30 words) describing a monster called '{}' \
encountered on floor {} of a dungeon. Be menacing and concise. \
Do not use quotation marks. Just the description.",
        enemy_name, floor
    )
}

/// Build a prompt for generating a room description.
pub fn room_prompt(room_type: &str, floor: u32) -> String {
    format!(
        "You are writing flavor text for a roguelike dungeon crawler. \
Write a single atmospheric sentence (under 30 words) describing a {} room \
on floor {} of a dungeon. Be evocative and concise. \
Do not use quotation marks. Just the description.",
        room_type, floor
    )
}

/// Build a prompt for generating a death epitaph.
pub fn death_epitaph_prompt(cause_of_death: &str, floor: u32, level: u32) -> String {
    format!(
        "You are writing an epitaph for a fallen adventurer in a roguelike dungeon crawler. \
They died on floor {}, level {}, cause: '{}'. \
Write a single poetic epitaph sentence (under 25 words). \
Be somber and evocative. Do not use quotation marks. Just the epitaph.",
        floor, level, cause_of_death
    )
}
