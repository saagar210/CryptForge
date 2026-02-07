use serde::{Deserialize, Serialize};

use super::entity::Position;

pub const MAP_WIDTH: usize = 80;
pub const MAP_HEIGHT: usize = 50;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TileType {
    Wall,
    Floor,
    DownStairs,
    UpStairs,
    DoorClosed,
    DoorOpen,
}

impl TileType {
    pub fn is_walkable(&self) -> bool {
        matches!(
            self,
            TileType::Floor | TileType::DownStairs | TileType::UpStairs | TileType::DoorOpen
        )
    }

    pub fn blocks_fov(&self) -> bool {
        matches!(self, TileType::Wall | TileType::DoorClosed)
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            TileType::Wall => "wall",
            TileType::Floor => "floor",
            TileType::DownStairs => "down_stairs",
            TileType::UpStairs => "up_stairs",
            TileType::DoorClosed => "door_closed",
            TileType::DoorOpen => "door_open",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Map {
    pub width: usize,
    pub height: usize,
    pub tiles: Vec<TileType>,
    pub revealed: Vec<bool>,
    pub rooms: Vec<Room>,
    pub blocked: Vec<bool>,
}

impl Map {
    pub fn new(width: usize, height: usize) -> Self {
        let size = width * height;
        Self {
            width,
            height,
            tiles: vec![TileType::Wall; size],
            revealed: vec![false; size],
            rooms: Vec::new(),
            blocked: vec![false; size],
        }
    }

    pub fn default_map() -> Self {
        Self::new(MAP_WIDTH, MAP_HEIGHT)
    }

    pub fn idx(&self, x: i32, y: i32) -> usize {
        (y as usize) * self.width + (x as usize)
    }

    pub fn in_bounds(&self, x: i32, y: i32) -> bool {
        x >= 0 && y >= 0 && (x as usize) < self.width && (y as usize) < self.height
    }

    pub fn is_walkable(&self, x: i32, y: i32) -> bool {
        if !self.in_bounds(x, y) {
            return false;
        }
        let idx = self.idx(x, y);
        self.tiles[idx].is_walkable() && !self.blocked[idx]
    }

    pub fn is_opaque(&self, x: i32, y: i32) -> bool {
        if !self.in_bounds(x, y) {
            return true;
        }
        self.tiles[self.idx(x, y)].blocks_fov()
    }

    pub fn set_tile(&mut self, x: i32, y: i32, tile: TileType) {
        if self.in_bounds(x, y) {
            let idx = self.idx(x, y);
            self.tiles[idx] = tile;
        }
    }

    pub fn get_tile(&self, x: i32, y: i32) -> TileType {
        if !self.in_bounds(x, y) {
            return TileType::Wall;
        }
        self.tiles[self.idx(x, y)]
    }

    pub fn reveal(&mut self, x: i32, y: i32) {
        if self.in_bounds(x, y) {
            let idx = self.idx(x, y);
            self.revealed[idx] = true;
        }
    }

    pub fn is_revealed(&self, x: i32, y: i32) -> bool {
        if !self.in_bounds(x, y) {
            return false;
        }
        self.revealed[self.idx(x, y)]
    }

    pub fn pos_to_idx(&self, pos: &Position) -> usize {
        self.idx(pos.x, pos.y)
    }

    pub fn idx_to_pos(&self, idx: usize) -> Position {
        Position::new((idx % self.width) as i32, (idx / self.width) as i32)
    }

    pub fn refresh_blocked(&mut self) {
        for i in 0..self.blocked.len() {
            self.blocked[i] = !self.tiles[i].is_walkable();
        }
    }

    pub fn reveal_all(&mut self) {
        for r in self.revealed.iter_mut() {
            *r = true;
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Room {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
    pub room_type: RoomType,
}

impl Room {
    pub fn new(x: i32, y: i32, width: i32, height: i32) -> Self {
        Self {
            x,
            y,
            width,
            height,
            room_type: RoomType::Normal,
        }
    }

    pub fn center(&self) -> Position {
        Position::new(self.x + self.width / 2, self.y + self.height / 2)
    }

    pub fn intersects(&self, other: &Room) -> bool {
        self.x <= other.x + other.width
            && self.x + self.width >= other.x
            && self.y <= other.y + other.height
            && self.y + self.height >= other.y
    }

    pub fn contains(&self, pos: &Position) -> bool {
        pos.x >= self.x
            && pos.x < self.x + self.width
            && pos.y >= self.y
            && pos.y < self.y + self.height
    }

    pub fn inner_positions(&self) -> Vec<Position> {
        let mut positions = Vec::new();
        for y in (self.y + 1)..(self.y + self.height - 1) {
            for x in (self.x + 1)..(self.x + self.width - 1) {
                positions.push(Position::new(x, y));
            }
        }
        positions
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RoomType {
    Normal,
    Start,
    Treasure,
    Boss,
    Shrine,
    Library,
    Armory,
}
