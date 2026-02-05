pub mod models;
pub mod repository;
pub mod sqlite_db;

pub use sqlite_db::SqliteDatabase as LazyDatabase; // Alias for backward compatibility during refactor
