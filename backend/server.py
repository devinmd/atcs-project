import sqlite3
import socketio
import eventlet
import eventlet.wsgi


DB_FILE = "data.db"
PORT = 5500

# create a socketio server
sio = socketio.Server(cors_allowed_origins="*")

# wrap with a wsgi app
app = socketio.WSGIApp(sio)


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
    sio.emit('my message', {'foo': 'bar'})


# send sall speech data to client
@sio.event
def get_all_speech(sid):
    print("client request all speech data:", sid)
    data = query_db("SELECT * FROM speech")
    sio.emit("all_speech", data, to=sid)


# send all summary data to client
@sio.event
def get_all_summaries(sid):
    print("client request all summary data:", sid)
    data = query_db("SELECT * FROM summary")
    sio.emit("all_summaries", data, to=sid)


# start the socketio server
def start_socket_server():
    eventlet.wsgi.server(eventlet.listen(('', PORT)), app)
