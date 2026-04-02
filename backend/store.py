from db import get_connection
# from main import session_id


# insert entry into the database
def add_entry(content):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
    INSERT INTO entries (content, session_id)
    VALUES (?, ?)
    """, (content, session_id))

    conn.commit()
    conn.close()


# insert entity into the database
def add_entity(content="", type="", status="",date=""):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
    INSERT INTO entities ( type, content, status, date, session_id)
    VALUES ( ?, ?, ?, ?, ?)
    """, (
        type,
        content,
        status,
        date,
        session_id
    ))

    conn.commit()
    conn.close()


# helper to add multiple entities
def add_entities(data):
    for i in data:
        add_entity(i["content"], i["type"],i["status"], i["date"])


# returns a list of the last X entries' content
def get_entries(limit=10):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
    SELECT content FROM entries
    ORDER BY id ASC
    LIMIT ?
    """, (limit,))

    rows = cur.fetchall()
    conn.close()

    return [row[0] for row in rows]


# generate a session id
def create_session_id():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
    SELECT id, content, created_at, session_id FROM entries
    ORDER BY id DESC
    LIMIT ?
    """, (1,))

    row = cur.fetchone()
    session_id = row[3] if row else -1

    conn.commit()
    conn.close()

    return session_id+1


session_id = create_session_id()
