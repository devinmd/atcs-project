import sqlite3
import threading
import socketio
from werkzeug.serving import make_server

DB_FILE = "data.db"
PORT = 5500

# create socketio server
# threading mode works with blocking audio loop in another thread.
# emitting from the audio thread is safe.
sio = socketio.Server(cors_allowed_origins="*", async_mode="threading")
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
    send_all_speech(sid)
    send_all_summaries(sid, "todo")
    send_all_summaries(sid, "note")


def send_app_data(sid):
    data = {
        "version": "0.0.0",
        "model": "Llama 3.2 8B Instruct IQ4 XS",
        "microphone": "Default Microphone"
    }
    sio.emit("app_data", data, to=sid)


def send_all_speech(sid):
    print("client request all speech data:", sid)
    data = query_db("SELECT * FROM speech")
    sio.emit("all_speech", data, to=sid)


def send_all_summaries(sid, type):
    print("client request all summaries data:", sid)
    if type:
        query = f"SELECT * FROM summaries WHERE type = '{type}'"
    else:
        query = "SELECT * FROM summaries"
        
    data = query_db(query)

    sio.emit("all_summaries", {"type": type, "data": data}, to=sid)

@sio.event
def delete_summary(sid, id):
    print("deleting summary", id)
    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()
    cur.execute("DELETE FROM summaries WHERE id = ?", (id,))
    conn.commit()
    conn.close()
    return {"deleted": id}
    

def start_socket_server():
    server = make_server("", PORT, app, threaded=True)
    server.serve_forever()
