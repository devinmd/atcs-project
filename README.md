# Restructure

A local, privacy-first assistant for capturing spoken or typed input and turning it into structured memory: notes, tasks, and searchable context.

The app extracts entities from incoming text, embeds them locally, and uses those embeddings to answer queries and generate overviews.

## Features
- Real-time transcription and structured extraction
- Local LLM converts speech/text into tasks and notes
- Semantic memory search using sentence-transformer embeddings
- Auto-generated overviews based on relevant memories
- React + Vite frontend with live socket updates

## Architecture
- Backend: Python server with audio/transcription support, embeddings, local LLM calls, and SQLite storage
- Frontend: Vite + React app communicating over socket.io

## Installation

### Prerequisites

- Python installed
- Node.js installed
- Hugging Face CLI for model downloads
  
### Install frontend dependencies

In `/frontend`

```sh
npm install
```

### Download model

In `/backend`

```sh
hf download unsloth/gemma-4-E4B-it-GGUF \
  --include "gemma-4-E4B-it-Q4_K_M.gguf" \
  --local-dir models/gemma4
```

## Running the app

1. Initialize the database once from `/backend` by running `db.py`
2. Start the backend server from `/backend` by running `main.py`
3. Start the frontend from `/frontend` by running `npm run dev`
4. Open the address shown in the terminal in a web browser

## How it works

### Data entry
1. User types into the entry box or speaks
2. speech is transcribed and text is parsed
3. Local LLM extracts structured entities (tasks, notes, due dates, etc.)
4. Entities are embedded and stored locally in an SQLite database
5. The frontend displays the tasks & notes

### Querying

1. User asks a question in chat
2. The query is embedded locally
3. Relevant entities are retrieved (using the embeddings)
4. The query and entities are passed to the local LLM
5. Response is generated and displayed on the frontend

## Checklist

- [x] Backend webserver
- [x] Frontend GUI
- [x] Faster transcription pipeline (whisper instead of vosk)
- [ ] Switch to websockets from HTTP for decreased latncy and bidirectional communication
- [x] Update frontend live as data is processed using websocket
- [x] Background processing for non-blocking input handling for listening, transcribing, and processing
- [x] Delete items
- [x] Query LLM over stored data in a chat interface
- [x] Local embedding-based retrieval for query context
- [ ] Include text files as context/notes
- [x] Store query-response pairs in the database
- [x] Load sentence-transformer model locally
- [x] LLM-generated overview from current tasks
- [x] Updated frontend UI
- [ ] Toggle todo status
- [x] Update frontend after entity deletion
- [x] Use Gemma 4 model instead of Llama
- [x] Fix bug where sending multiple queries would crash the program