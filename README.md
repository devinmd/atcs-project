# AT CS Project

A local, privacy-first assistant that can listen, transcribe, and accept typed inputs to convert into structured memory (notes & tasks). The app embeds and indexes extracted entities so you can query your brain and generate automatic overviews.

## Features
- Real-time transcription and extraction
- Automatic data structuring: Local LLM converts transcriptions and text into structured tasks and notes
- Semantic search & querying: Sentence-transformer embeddings find relevant memories
- Overview generation: LLM produces daily overviews
- Web UI: Frontend Web UI allows for data entry and viewing

## Usage
- Use the microphone button to speak or type text into the main entry box
- The backend converts these into structured tasks or notes and embeds them
- Use the chat to query your memories and data, relevant entities are sent to the LLM to generate 
- Daily overview is generated from relevant entities

## Architecture
- Backend: Python server handling audio, transcription, embeddings, LLM calls, and SQLite DB
- Frontend: Vite + React connected to backend using socket.io

## Installation instructions

### Install Python

MacOS (Homebrew)

```
brew install python
```

### Install Hugging Face CLI (to download models)

MacOS

```
curl -LsSf https://hf.co/cli/install.sh | bash
```

### Install Model .gguf in `/backend` using Hugging Face

```shell
hf download unsloth/gemma-4-E4B-it-GGUF \
  --include "gemma-4-E4B-it-Q4_K_M.gguf" \
  --local-dir models/gemma4
```

### Install node modules in `/frontend`

Ensure Node.js is installed

```shell
npm i
```

## Usage

1. Run `db.py` in `/backend` once to initialize the database

2. Run `main.py` in `/backend` to run the app and host server

3. Run `npm run dev` in `/frontend` to host the web interface

4. Navigate to `localhost:PORT` in any web browser to access the web interface (PORT is whatever port # showed up in the console after running the frontend webserver)

## Data Pipeline

### Data entry

1. Entry (Speech or text, speech is transcribed)
2. Converted to an entity (formatted data with deadlines, status, etc. extracted) using a local LLM
3. Entity is embedded using sentence-transformer
4. Entry and Entity are stored to a local database
5. Entry and Entity are displayed on the frontend

### Querying

1. User sends a query
2. Query is embedded using sentence-transformer
3. Top relevant entities are found using the embeddings and cosine similiarity
4. Relevant entities & query are passed to the local LLM to generate an answer
5. Query and answer are displayed on the frontend

## Todo Checklist

- [x] Host webserver for a backend
- [x] Host webserver for frontned GUI
- [x] Use faster-whisper instead of vosk
- [x] Use websockets instead of http requests for the web GUI for decreased latncy and bidirectional communication
- [x] Run listening, transcribing, and processing in separate threads to prevent blocking
- [x] Send events from the backend to update the frontend when new data is received
- [x] Delete items
- [x] query llm about entries in the database in a chat interface
- [x] embed entities to be able to search through them for answering queries
- [ ] include text files as context/notes
- [x] store queries & responses as pairs in database
- [x] fetch & display queries & responses on frontend on load
- [x] load sentence transformer model locally instead of fetching config files from web
- [x] add LLM overview that outlines current tasks
- [x] rework frontend user interface
- [ ] add ability to change status of todos
- [ ] update frontend when deleting entities
- [x] switch to using a Gemma 4 model instead of Llama
- [ ] allow parallel processing to prevent crashing when multiple overviews are requested or multiple entries are trying to be processed at once
