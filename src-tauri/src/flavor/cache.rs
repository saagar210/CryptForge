use std::collections::HashMap;

/// Cache key for a flavor text request.
#[derive(Debug, Clone, Hash, PartialEq, Eq)]
pub struct FlavorKey {
    pub seed: u64,
    pub floor: u32,
    pub entity_type: String,
    pub index: u32,
}

/// In-memory cache for generated flavor text.
pub struct FlavorCache {
    entries: HashMap<FlavorKey, String>,
}

impl FlavorCache {
    pub fn new() -> Self {
        Self {
            entries: HashMap::new(),
        }
    }

    pub fn get(&self, key: &FlavorKey) -> Option<&String> {
        self.entries.get(key)
    }

    pub fn insert(&mut self, key: FlavorKey, value: String) {
        self.entries.insert(key, value);
    }

    pub fn clear(&mut self) {
        self.entries.clear();
    }

    pub fn len(&self) -> usize {
        self.entries.len()
    }
}
