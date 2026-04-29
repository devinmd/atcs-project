import json
import sqlite3
import threading
import socketio
from config import *
from werkzeug.serving import make_server
from store import add_entity, add_entry, get_entries, add_entities, add_query

# create socketio server
# threading mode works with blocking audio loop in another thread.
# emitting from the audio thread is safe.
sio = socketio.Server(cors_allowed_origins="*",
                      async_mode="threading", logger=False, engineio_logger=False)
app = socketio.WSGIApp(sio)

current_status = []
# prevents multiple threads from accessing current_status at the same time
_status_lock = threading.Lock()


def add_status(activity):
    with _status_lock:
        if activity not in current_status:
            current_status.append(activity)
        sio.emit("status", {"status": list(current_status)})


def remove_status(activity):
    with _status_lock:
        if activity in current_status:
            current_status.remove(activity)
        sio.emit("status", {"status": list(current_status)})


def query_db(query):
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(query)
    rows = cur.fetchall()
    conn.close()
    return [dict(row) for row in rows]


@sio.event
def connect(sid, environ):
    print("CONNECTED:", sid)
    with _status_lock:
        sio.emit("status", {"status": list(current_status)}, to=sid)
    send_app_data(sid)
    send_all_entries(sid)
    send_all_queries(sid)
    send_all_entities(sid, "todo")
    send_all_entities(sid, "note")


def send_app_data(sid):
    data = {
        "version": "0.0.0",
        "model": "Llama 3.2 8B Instruct IQ4 XS",
        "microphone": "Default Microphone"
    }
    sio.emit("app_data", data, to=sid)


def send_all_entries(sid):
    print("client request all entries:", sid)
    data = query_db("SELECT id, content, created_at, session_id FROM entries")
    sio.emit("all_entries", data, to=sid)


def send_all_queries(sid):
    print("client request all queries:", sid)
    data = query_db("SELECT id, content, created_at, session_id FROM queries")
    sio.emit("all_queries", data, to=sid)


def send_all_entities(sid, type):
    print("client request all entities data:", sid)
    if type:
        query = f"SELECT id, type, content, status, date, priority_rank, created_at, session_id FROM entities WHERE type = '{type}'"
    else:
        query = "SELECT id, type, content, status, date, priority_rank, created_at, session_id FROM entities"

    data = query_db(query)

    sio.emit("all_entities", {"type": type, "data": data}, to=sid)


@sio.event
def delete_entity(sid: str, id: int):
    print("deleting entity", id)
    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()
    cur.execute("DELETE FROM entities WHERE id = ?", (id,))
    conn.commit()
    conn.close()
    return {"deleted": id}


# receive an entry and process it
@sio.event
def receive_entry(sid: str, msg: str):
    '''
    receive an entry from the frontend
    send to llm for processing
    parse as json
    add entry to db
    add processed entity to db
    '''
    from workers import process_entry, embed_text
    entityString = process_entry(f"{msg}").strip()  # generate string
    entityJsonList = json.loads(entityString)  # parse as json

    embedding = embed_text(entityString)
    embedding_bytes = embedding.tobytes()
    add_entities(entityJsonList, embedding_bytes)  # add to db
    update_entities(entityJsonList)  # send to frontend

    add_entry(msg)


# receive a query and process it
@sio.event
def receive_query(sid: str, msg: str):
    '''
    get all entities
    find relevant entities to use as context using the embeddings
    query the llm with the context and query message
    emit the response to the connected websocket
    '''

    from workers import query_llm, find_relevant_entities, get_all_entities
    add_status("Querying")

    all_entities = get_all_entities()
    relevant_entities = find_relevant_entities(msg, 5, all_entities)

    # perhaps get some context from entries
    response = query_llm(f"Context: {relevant_entities}\nQuery: {msg}")
    # emit response directly to frontend
    sio.emit("query_response", {"query": msg, "response": response}, to=sid)
    remove_status("Querying")
    add_query(msg)


@sio.event
def generate_overview(sid: str):
    '''
    get all entities
    '''
    from workers import query_llm, find_relevant_entities, get_all_entities
    add_status("Querying")
    all_entities = get_all_entities()
    relevant_entities = find_relevant_entities(
        OVERVIEW_PROMPT, 5, all_entities)
    response = query_llm(f"{relevant_entities}")
    sio.emit("overview_response", response, to=sid)
    remove_status("Querying")


# send one entry that was added to the DB
def update_entries(entry):
    sio.emit("update_entries", entry)


# send one query that was added to the DB
def update_queries(query):
    sio.emit("update_queries", query)


# send one entity that was added to the DB
def update_entities(entity):
    sio.emit("update_entities", entity)


@sio.event
def toggle_mic(sid: str, value: bool):
    from workers import toggle_audio
    toggle_audio(value)


def start_socket_server():
    server = make_server("", PORT, app, threaded=True)
    server.serve_forever()
