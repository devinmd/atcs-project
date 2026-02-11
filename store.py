from db import get_connection


# insert speech into the database
def insert_speech(text):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
    INSERT INTO speech (text)
    VALUES (?)
    """, (text,))

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
    SELECT id, text FROM transcript
    ORDER BY id ASC
    LIMIT ?
    """, (limit,))

    rows = cur.fetchall()
    conn.close()
    return rows
