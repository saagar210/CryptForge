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

#[cfg(test)]
mod tests {
    use super::*;

    fn make_key(seed: u64, floor: u32, entity_type: &str, index: u32) -> FlavorKey {
        FlavorKey {
            seed,
            floor,
            entity_type: entity_type.to_string(),
            index,
        }
    }

    #[test]
    fn empty_cache() {
        let cache = FlavorCache::new();
        assert_eq!(cache.len(), 0);
    }

    #[test]
    fn insert_and_get() {
        let mut cache = FlavorCache::new();
        let key = make_key(42, 1, "enemy", 0);
        cache.insert(key.clone(), "A fearsome goblin".to_string());
        assert_eq!(cache.len(), 1);
        assert_eq!(cache.get(&key).unwrap(), "A fearsome goblin");
    }

    #[test]
    fn get_missing_returns_none() {
        let cache = FlavorCache::new();
        let key = make_key(42, 1, "enemy", 0);
        assert!(cache.get(&key).is_none());
    }

    #[test]
    fn clear_empties_cache() {
        let mut cache = FlavorCache::new();
        cache.insert(make_key(1, 1, "item", 0), "shiny".to_string());
        cache.insert(make_key(1, 1, "item", 1), "dull".to_string());
        assert_eq!(cache.len(), 2);
        cache.clear();
        assert_eq!(cache.len(), 0);
    }

    #[test]
    fn overwrite_same_key() {
        let mut cache = FlavorCache::new();
        let key = make_key(42, 1, "room", 0);
        cache.insert(key.clone(), "old text".to_string());
        cache.insert(key.clone(), "new text".to_string());
        assert_eq!(cache.len(), 1);
        assert_eq!(cache.get(&key).unwrap(), "new text");
    }

    #[test]
    fn different_keys_different_entries() {
        let mut cache = FlavorCache::new();
        cache.insert(make_key(1, 1, "enemy", 0), "text1".to_string());
        cache.insert(make_key(1, 1, "enemy", 1), "text2".to_string());
        cache.insert(make_key(1, 2, "enemy", 0), "text3".to_string());
        assert_eq!(cache.len(), 3);
    }
}
