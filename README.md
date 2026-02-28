# AT CS Project

App that transcribes the user's microphone input and then summarizes the content in a web interface.

## Installation instructions

### Install Python 3.12

MacOS

```shell
brew install python@3.12
```

### Install Hugging Face (to download models)

### Install Llama model(s)

Llama 3.2 1-Billion Instruct (~17 GB for all, ~2.5 GB for the f16 gguf)

```shell
hf download bartowski/Llama-3.2-1B-Instruct-GGUF --include "*.gguf" --local-dir models/llama3.2
```

Llama 3.2 8-Billion Instruct (~76 GB for all, ~16 GB for the f16 gguf)

```shell
hf download mradermacher/Llama-3.2-8B-Instruct-GGUF --include "*.gguf" --local-dir models/llama3.2
```

## Usage

1. Run `db.py` in `/backend` once to initialize the database

2. Run `main.py` in `/backend` to run the app

3. Run `npm run dev -- --host` in `/frontend` to run the web interface
