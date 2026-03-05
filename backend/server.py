import sqlite3
import socketio
import eventlet
import eventlet.wsgi

PORT = 5500

# create a socketio server
sio = socketio.Server(cors_allowed_origins='*')
# wrap with a wsgi app
app = socketio.WSGIApp(sio)

DB_FILE = "data.db"


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
    print('CONNECTED:', sid)


@sio.event
def get_all_speech(sid):
    print("client request all speech data:", sid)
    data = query_db("SELECT * FROM speech")
    sio.emit("all_speech_data", data, to=sid)


@sio.event
def get_all_summaries(sid):
    print("client request all summary data:", sid)
    data = query_db("SELECT * FROM summary")
    sio.emit("all_summaries", data, to=sid)


def send_all_speech_data():
    data = query_db("SELECT * FROM speech")
    sio.emit("all_speech_data", data)


def send_all_summary_data():
    data = query_db("SELECT * FROM summary")
    sio.emit("all_summaries", data)


def send_status(status):
    print("sending status")
    sio.emit("app_status", {"app_status": status})


def start_socket_server():
    eventlet.wsgi.server(eventlet.listen(('', PORT)), app)
