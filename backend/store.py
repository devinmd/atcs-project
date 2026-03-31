from db import get_connection
# from main import session_id

# insert speech into the database


def insert_speech(text):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
    INSERT INTO speech (text, session_id)
    VALUES (?, ?)
    """, (text, session_id))

    conn.commit()
    conn.close()


# insert summary into the database
def insert_summary(text="", type="", deadline=""):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
    INSERT INTO summaries ( type, text, deadline, session_id)
    VALUES ( ?, ?, ?, ?)
    """, (
        type,
        text,
        deadline,
        session_id
    ))

    conn.commit()
    conn.close()


# retrieve speech from the database (last 10 entries)
def get_speech(limit=10):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
    SELECT id, text FROM speech
    ORDER BY id ASC
    LIMIT ?
    """, (limit,))

    rows = cur.fetchall()
    conn.close()
    return rows


#
def create_session_id():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
    SELECT id, text, timestamp, session_id FROM speech
    ORDER BY id DESC
    LIMIT ?
    """, (1,))

    row = cur.fetchone()
    session_id = row[3] if row else -1

    conn.commit()
    conn.close()

    return session_id+1


session_id = create_session_id()
