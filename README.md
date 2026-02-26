# AT CS Project

An app that transcribes the user's microphone input and then summarizes the content

## Installation instructions

### Install Python 3.12

MacOS

```shell
brew install python@3.12
```

### Install llama.cpp Python bindings

```shell
pip install llama-cpp-python
```

### Install Llama model(s)

```shell
huggingface-cli download \
  bartowski/Llama-3.2-1B-Instruct-GGUF \
  --include "*.gguf" \
  --local-dir models/llama3.2
```

## Usage

1. Run `db.py` in `/backend` once to initialize the database

2. Run `main.py` in `/backend` to run the app

3. Run `npm run dev -- --host` in `/frontend` to run the webapp
