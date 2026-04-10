import sqlite3
from pathlib import Path

DB_PATH = Path("./data.db")


def get_connection():
    return sqlite3.connect(DB_PATH)


# initialize the database and create tables
def initialize_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        session_id INTEGER
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS entities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        status TEXT,
        date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        session_id INTEGER
    )
    """)
    conn.commit()
    conn.close()


if __name__ == "__main__":
    initialize_db()
    print("DATABASE INITIALIZED")
