import sqlite3
from db import get_connection


# insert entry into the database
def add_entry(content):
    from server import update_entries
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("""
    INSERT INTO entries (content, session_id)
    VALUES (?, ?)
    RETURNING id, content, session_id, created_at
    """, (content, session_id))

    row = cur.fetchone()

    conn.commit()
    conn.close()

    update_entries(dict(row))


# insert query into the database
def add_query(content):
    from server import update_queries
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("""
    INSERT INTO queries (content, session_id)
    VALUES (?, ?)
    RETURNING id, content, session_id, created_at
    """, (content, session_id))

    row = cur.fetchone()

    conn.commit()
    conn.close()

    update_queries(dict(row))


# insert entity into the database
def add_entity(content="", type="", status="", date=""):
    from server import update_entities
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("""
    INSERT INTO entities (type, content, status, date, session_id)
    VALUES (?, ?, ?, ?, ?)
    RETURNING id, type, content, status, date, session_id, created_at
    """, (type, content, status, date, session_id))

    row = cur.fetchone()

    conn.commit()
    conn.close()

    update_entities(dict(row))


# helper to add multiple entities
def add_entities(data):
    for i in data:
        add_entity(i["content"], i["type"], i["status"], i["date"])


# returns a list of the last X entries' content
def get_entries(limit=10):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
    SELECT content FROM entries
    ORDER BY id DESC
    LIMIT ?
    """, (limit,))

    rows = cur.fetchall()
    conn.close()

    return [row[0] for row in rows][::-1]


# generate a session id
def create_session_id():
    """
    Generates a new session ID by retrieving the highest existing session_id from the entries table and incrementing it by 1.
    Returns:
        int: The next available session_id.
    """
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
    SELECT MAX(session_id) FROM entries
    """)

    row = cur.fetchone()
    max_session_id = row[0] if row and row[0] is not None else 0

    conn.close()

    return max_session_id + 1


session_id = create_session_id()
