import db from '../../config/database.js';
export const createTables = () => {
    try {
        db.exec(`
            CREATE TABLE IF NOT EXISTS devices_records (
                device_id TEXT PRIMARY KEY NOT NULL,
                current_status TEXT NOT NULL,
                device_type TEXT NOT NULL,
                last_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );`
        );
    } catch (e) {
        console.log('Error while creating tables:', e);
    }
}