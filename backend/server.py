from flask import Flask, jsonify
from flask_cors import CORS
import sqlite3

app = Flask(__name__)
CORS(app)

DB_FILE = "data.db"


def query_db(query):
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(query)
    rows = cur.fetchall()
    conn.close()
    return [dict(row) for row in rows]


@app.route("/speech", methods=["GET"])
def get_speech():
    return jsonify(query_db("SELECT * FROM speech"))


@app.route("/summaries", methods=["GET"])
def get_summaries():
    return jsonify(query_db("SELECT * FROM summary"))


@app.route("/")
def home():
    return "hello world"


if __name__ == "__main__":
    app.run(port=5000, debug=True)
