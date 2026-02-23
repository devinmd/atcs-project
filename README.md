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
Run `db.py` once to initialize the database
```shell
python db.py
```
Run `main.py` to run the app
```shell
python main.py
```