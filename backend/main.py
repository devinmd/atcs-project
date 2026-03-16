import asyncio
import json
import threading
import time
from llama_cpp import Llama
from faster_whisper import WhisperModel
import sounddevice as sd
import numpy as np
import queue
import sys
from store import create_session_id, insert_speech, insert_summary
from server import start_socket_server, add_status, remove_status


# whisper settings
MODEL_SIZE = "base"  # tiny, base, small, medium, large-v3
COMPUTE_TYPE = "float32"  # int8, int16, float16, float32
SAMPLE_RATE = 16000
CHUNK_DURATION = 5  # seconds
BEAM_SIZE = 10  # 1=fastest, 10=best accuracy


# load whisper model
model = WhisperModel(MODEL_SIZE, compute_type=COMPUTE_TYPE)

# system prompt for llm
SYSTEM_PROMPT = """
You are a helpful assistant connected to a speech-to-text system. Your only job is to act as a brain and notetaker, remember, summarize, and extract to-do items from user speech, nothing else.
If the user is describing a task, todo, or reminder, extract it as a todo with optional deadline
If the user is making a note or idea, extract it as a note
Only use data & information from the users prompt.
Only ever respond with JSON formatted as follows: {"type": "todo" | "note", "text": "data here", "deadline": "deadline if applicable"}
"""

MESSAGE_CHUNK_SIZE = 20

# initialize the LLM
llm = Llama(
    model_path="./models/llama3.2/Llama-3.2-8B-Instruct.IQ4_XS.gguf",  # takes ~10 seconds
    n_gpu_layers=-1,
    n_ctx=1024,
    verbose=False
)

# queues for all processes
audio_queue = queue.Queue()
transcription_queue = queue.Queue()
text_queue = queue.Queue()
llm_queue = queue.Queue()


# make the llm summaries, llm queue -> database
'''
process_llm()
  while True
    msg = item from llm queue (wait here if queue is empty)
    summaryString = run llm on msg
    TRY
      parse json
    EXCEPT error
      fallback to a different json object
    store summary in database
'''
def process_llm():
    while True:
        msg = llm_queue.get()

        print('SUMMARIZING')

        summaryString = summarize_llm(msg).strip()
        print(summaryString)

        try:
            summaryJSON = json.loads(summaryString)
        except:
            summaryJSON = {"type": "other", "text": summaryString}

        insert_summary(
            type=summaryJSON["type"],
            text=summaryJSON["text"],
            session_id=session_id
        )


# combine text, text queue -> llm queue
def create_text_chunks():
    current_message = ""

    while True:
        text = text_queue.get()

        print("DETECTED TEXT",text)

        current_message += " " + text
        current_message = current_message.strip()

        # if message is over MESSAGE_CHUNK_SIZE, then send to llm
        if len(current_message) > MESSAGE_CHUNK_SIZE:
            llm_queue.put(current_message)
            current_message = ""


# transcribe using whisper, audio queue -> text queue
def transcribe_audio():
    while True:
        audio_np = transcription_queue.get()

        print('TRANSCRIBING')

        segments, info = model.transcribe(
            audio_np,
            beam_size=BEAM_SIZE,
            language="en",
            condition_on_previous_text=True
        )

        text = " ".join(s.text.strip() for s in segments if s.text.strip())

        if text:
            text_queue.put(text)


# combine audio chunks, audio samples -> audio queue
def audio_handler():
    while True:
        audio_data = []
        samples_collected = 0
        target_samples = SAMPLE_RATE * CHUNK_DURATION

        while samples_collected < target_samples:
            chunk = audio_queue.get()
            audio_data.append(chunk)
            samples_collected += len(chunk)

        audio_np = np.concatenate(audio_data, axis=0).flatten()

        transcription_queue.put(audio_np)


# method to summarize text using the LLM
def summarize_llm(text):

    print("SUMMARIZING...")

    output = llm.create_chat_completion(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": text}
        ],
        temperature=0.2
    )
    return (output['choices'][0]['message']['content'])


def audio_callback(indata, frames, time, status):
    # runs after every sample is collected and puts it into a queue
    if status:
        print(status, file=sys.stderr)
    audio_queue.put(indata.copy())


session_id = create_session_id()
print("INITIALIZED")


def audio_loop():
    with sd.InputStream(
        samplerate=SAMPLE_RATE,
        channels=1,
        callback=audio_callback,
        dtype="float32"
    ):
        print("AUDIO STREAM STARTED")

        try:
            while True:
                time.sleep(1)  # keep thread alive
        except KeyboardInterrupt:
            print("Stopped")


if __name__ == "__main__":
    # run socketio server in a daemon thread so the main thread can run the audio loop
    threading.Thread(target=start_socket_server, daemon=True).start()
    threading.Thread(target=audio_handler, daemon=True).start()
    threading.Thread(target=transcribe_audio, daemon=True).start()
    threading.Thread(target=create_text_chunks, daemon=True).start()
    threading.Thread(target=process_llm, daemon=True).start()
    time.sleep(0.5)

    # main thread runs the blocking audio loop, it can make sio.emit() calls safely because of threading async_mode
    audio_loop()
