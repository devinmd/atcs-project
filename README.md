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

### Install Llama model .gguf in `/backend`

Llama 3.2 8B Instruct IQ4 XS (4 GB)

```shell
hf download mradermacher/Llama-3.2-8B-Instruct-GGUF \
  --include "Llama-3.2-8B-Instruct.IQ4_XS.gguf" \
  --local-dir models/llama3.2
```

The less quantized versions of Llama 3.2 8B Instruct take far too long to generate responses. Llama 3.2 1B Instruct is faster does not work due to its low accuracy.

### Install node modules in `/frontend`

Ensure Node.js is installed

```shell
npm i
```

## Usage

1. Run `db.py` in `/backend` once to initialize the database

2. Run `main.py` in `/backend` to run the app and host server

3. Run `npm run dev` in `/frontend` to host the web interface

4. Navigate to `localhost:PORT` in any web browser to access the web interface (PORT is whatever port # showed up in the console after running the frontend webserver, most likely 5173)
