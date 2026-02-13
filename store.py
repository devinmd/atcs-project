from db import get_connection

# insert speech into the database


def insert_speech(text, session_id=0):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
    INSERT INTO speech (text, session_id)
    VALUES (?, ?)
    """, (text, session_id))

    conn.commit()
    conn.close()

    print("Inserted speech into database")


# insert summary into the database
def insert_summary(source_ids, text):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
    INSERT INTO summary ( source_ids, text)
    VALUES (?, ?)
    """, (
        ",".join(map(str, source_ids)),
        text
    ))

    conn.commit()
    conn.close()
    print("Inserted summary into database")


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


def create_session_id():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
    SELECT id, text FROM speech
    ORDER BY id ASC
    LIMIT ?
    """, (1,))

    row = cur.fetchone()
    session_id = row[3] if row else -1

    conn.commit()
    conn.close()

    print(f"SESSION ID: {session_id+1}")
    return session_id+1
