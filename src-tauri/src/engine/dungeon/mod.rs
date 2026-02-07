pub mod bsp;
pub mod cellular;
pub mod corridor;
pub mod placement;
pub mod room;

use rand::rngs::StdRng;
use rand::{Rng, SeedableRng};

use crate::engine::map::{Map, TileType};

use self::room::{assign_room_types, get_stairs_room_idx};

const FLOOR_SEED_MULTIPLIER: u64 = 0x9E3779B97F4A7C15;

pub fn generate_floor(seed: u64, floor: u32) -> Map {
    let floor_seed = seed.wrapping_add((floor as u64).wrapping_mul(FLOOR_SEED_MULTIPLIER));
    let mut rng = StdRng::seed_from_u64(floor_seed);

    let is_boss_floor = matches!(floor, 3 | 6 | 10) || (floor > 10 && floor % 5 == 0);

    let mut map = match floor {
        1..=3 => bsp::generate_bsp(&mut rng),
        4 => {
            // 60% BSP, 40% cellular
            if rng.gen::<f64>() < 0.6 {
                bsp::generate_bsp(&mut rng)
            } else {
                cellular::generate_cellular(&mut rng)
            }
        }
        5 => {
            // 40% BSP, 60% cellular
            if rng.gen::<f64>() < 0.4 {
                bsp::generate_bsp(&mut rng)
            } else {
                cellular::generate_cellular(&mut rng)
            }
        }
        6..=9 => cellular::generate_cellular(&mut rng),
        10 => generate_arena(&mut rng),
        _ => {
            // Endless mode: cycle between types
            let cycle = (floor - 11) % 3;
            match cycle {
                0 => bsp::generate_bsp(&mut rng),
                1 => cellular::generate_cellular(&mut rng),
                _ => bsp::generate_bsp(&mut rng),
            }
        }
    };

    // Assign room types
    assign_room_types(&mut map.rooms, &mut rng, is_boss_floor);

    // Place stairs in the furthest room from start
    if let Some(stairs_idx) = get_stairs_room_idx(&map.rooms) {
        let pos = map.rooms[stairs_idx].center();
        map.set_tile(pos.x, pos.y, TileType::DownStairs);
    }

    // Place up stairs in start room (except floor 1)
    if floor > 1 {
        if let Some(start_room) = map.rooms.iter().find(|r| r.room_type == crate::engine::map::RoomType::Start) {
            let pos = start_room.center();
            // Offset slightly so up and down stairs aren't on same tile on floor 1
            let up_x = pos.x + 1;
            let up_y = pos.y;
            if map.in_bounds(up_x, up_y) && map.get_tile(up_x, up_y) == TileType::Floor {
                map.set_tile(up_x, up_y, TileType::UpStairs);
            }
        }
    }

    map
}

fn generate_arena(_rng: &mut impl rand::Rng) -> Map {
    use crate::engine::map::{Map, Room, MAP_HEIGHT, MAP_WIDTH};

    let mut map = Map::new(MAP_WIDTH, MAP_HEIGHT);

    // Large central arena
    let arena_x = 20;
    let arena_y = 10;
    let arena_w = 40;
    let arena_h = 30;

    // Carve arena
    for y in arena_y..(arena_y + arena_h) {
        for x in arena_x..(arena_x + arena_w) {
            map.set_tile(x, y, TileType::Floor);
        }
    }

    // Four corner rooms
    let corner_rooms = [
        (5, 5, 10, 8),
        (65, 5, 10, 8),
        (5, 37, 10, 8),
        (65, 37, 10, 8),
    ];

    for &(rx, ry, rw, rh) in &corner_rooms {
        for y in (ry + 1)..(ry + rh - 1) {
            for x in (rx + 1)..(rx + rw - 1) {
                map.set_tile(x, y, TileType::Floor);
            }
        }
    }

    // Corridors connecting corners to arena
    // Horizontal corridors
    for x in 15..arena_x {
        map.set_tile(x, 9, TileType::Floor);
        map.set_tile(x, 41, TileType::Floor);
    }
    for x in (arena_x + arena_w)..65 {
        map.set_tile(x, 9, TileType::Floor);
        map.set_tile(x, 41, TileType::Floor);
    }

    // Build rooms list
    let mut rooms = vec![
        Room::new(arena_x, arena_y, arena_w, arena_h),
    ];
    for &(rx, ry, rw, rh) in &corner_rooms {
        rooms.push(Room::new(rx, ry, rw, rh));
    }

    map.rooms = rooms;
    map.refresh_blocked();
    map
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::engine::map::RoomType;

    #[test]
    fn floor_generation_produces_valid_maps() {
        let seed = 12345u64;
        for floor in 1..=12 {
            let map = generate_floor(seed, floor);

            assert!(!map.rooms.is_empty(), "floor {floor}: no rooms");

            // Has a start room
            assert!(
                map.rooms.iter().any(|r| r.room_type == RoomType::Start),
                "floor {floor}: no start room"
            );

            // Has down stairs
            let has_stairs = map.tiles.iter().any(|t| *t == TileType::DownStairs);
            assert!(has_stairs, "floor {floor}: no down stairs");
        }
    }

    #[test]
    fn seed_determinism() {
        let seed = 42u64;
        let map1 = generate_floor(seed, 1);
        let map2 = generate_floor(seed, 1);
        assert_eq!(map1.tiles, map2.tiles);
        assert_eq!(map1.rooms.len(), map2.rooms.len());
    }
}
