import json
import sqlite3
import threading
import socketio
from werkzeug.serving import make_server
from store import add_entity, add_entry, get_entries, add_entities

DB_FILE = "data.db"
PORT = 5500

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
    send_all_entities(sid, "todo")
    send_all_entities(sid, "note")
    send_all_entities(sid, "query_response")


def send_app_data(sid):
    data = {
        "version": "0.0.0",
        "model": "Llama 3.2 8B Instruct IQ4 XS",
        "microphone": "Default Microphone"
    }
    sio.emit("app_data", data, to=sid)


def send_all_entries(sid):
    print("client request all entries:", sid)
    data = query_db("SELECT * FROM entries")
    sio.emit("all_entries", data, to=sid)


def send_all_entities(sid, type):
    print("client request all entities data:", sid)
    if type:
        query = f"SELECT * FROM entities WHERE type = '{type}'"
    else:
        query = "SELECT * FROM entities"

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
    # process it automatically
    from workers import summarize_llm
    add_status("Processing")
    entries = get_entries(5)
    summaryString = summarize_llm(f"{{context: {entries}, new_entry_content: {msg}}}").strip()
    print(summaryString)
    summaryJsonList = json.loads(summaryString)
    add_entities(summaryJsonList)
    remove_status("Processing")
    update_entities(summaryJsonList)
    add_entry(msg)


#
@sio.event
def process_entries(sid: str, num: int):
    from workers import summarize_llm
    add_status("Processing")
    entries = get_entries(10)
    summaryString = summarize_llm(entries).strip()
    print(summaryString)
    summaryJsonList = json.loads(summaryString)
    add_entities(summaryJsonList)
    remove_status("Processing")


# send one entry that was added to the DB
def update_entries(entry):
    sio.emit("update_entries", entry)


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
