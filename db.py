import sqlite3
from pathlib import Path

DB_PATH = Path("data.db")


def get_connection():
    return sqlite3.connect(DB_PATH)

# initialize the database and create tables
def initialize_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS speech (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS summary (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        speech_ids TEXT,     -- comma separated transcript IDs
        text TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)
    conn.commit()
    conn.close()


if __name__ == "__main__":
    initialize_db()
    print("DATABASE INITIALIZED")
