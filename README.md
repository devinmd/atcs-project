# AT CS Project

App that transcribes the user's microphone input and then summarizes the content in a web interface.

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

Llama 3.2 8B Instruct IQ4 XS (~4 GB)

```shell
hf download mradermacher/Llama-3.2-8B-Instruct-GGUF \
  --include "Llama-3.2-8B-Instruct.IQ4_XS.gguf" \
  --local-dir models/llama3.2
```

The less quantized versions of Llama 3.2 8B Instruct take far too long to generate responses. Llama 3.2 1B Instruct is faster but does not work well due to its low accuracy.

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


## Todo Checklist

- [x] Host webserver for a backend
- [x] Host webserver for frontned GUI
- [x] Use faster-whisper instead of vosk
- [x] Use websockets instead of http requests for the web GUI for decreased latncy and bidirectional communication
- [x] Run listening, transcribing, and processing in separate threads to prevent blocking
- [x] Send events from the backend to update the frontend when new data is received
- [x] Delete items
- [x] query llm about entries in the database in a chat interface
- [ ] remove queries from database? storing them is unecessary unless we store answers as well
