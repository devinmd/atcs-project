import json
import numpy as np
import queue
from config import *
from main import model, llm
from store import add_entity, add_entry
from server import add_status, remove_status

import threading

# queues for all processes
audio_queue = queue.Queue()
transcription_queue = queue.Queue()
text_queue = queue.Queue()
llm_queue = queue.Queue()


audio_on = threading.Event()


def toggle_audio(on):
    print(on)
    if on:
        audio_on.set()
        add_status("Listening")
    else:
        audio_on.clear()
        remove_status("Listening")


# make the llm summaries, llm queue -> database
'''
while True
    msg = item from llm queue (wait here if queue is empty)
    summaryString = run llm on msg
    TRY
        parse json
    EXCEPT error
        fallback to a different json object
    store summary in database
'''
def llm_worker():
    while True:
        msg = llm_queue.get()

        print('SUMMARIZING')
        add_status("Processing")

        summaryString = summarize_llm(msg).strip()
        print(summaryString)

        try:
            summaryJSON = json.loads(summaryString)
        except:
            summaryJSON = {"type": "other", "text": summaryString}

        add_entity(
            type=summaryJSON["type"],
            content=summaryJSON["text"],
        )
        remove_status("Processing")


# combine all of the text, text queue -> llm queue
'''
while True
    text = data from text queue (wait here if queue is empty)
    add to current message string
    IF message length > MESSAGE_CHUNK_SIZE
        send to llm queue for processing
        reset current message
'''
def create_text_chunks_worker():
    current_message = ""

    while True:
        text = text_queue.get()

        print("DETECTED TEXT", text)

        current_message += " " + text
        current_message = current_message.strip()

        # if message is over MESSAGE_CHUNK_SIZE, then send to llm
        if len(current_message) > MESSAGE_CHUNK_SIZE:
            llm_queue.put(current_message)
            add_entry(current_message, "capture")
            current_message = ""


# transcribe using whisper, audio queue -> text queue, this one runs every X seconds
'''
while True
    audio_np = data from transcription queue
    segments = data from whisper transcription
    IF text was detected
        add to text queue to be chunked
'''
def transcribe_audio_worker():
    while True:
        audio_np = transcription_queue.get()

        print('TRANSCRIBING')
        add_status("Transcribing")

        segments, info = model.transcribe(
            audio_np,
            beam_size=BEAM_SIZE,
            language="en",
            condition_on_previous_text=True
        )

        text = " ".join(s.text.strip() for s in segments if s.text.strip())

        if text:
            text_queue.put(text)

        remove_status("Transcribing")


# combine audio chunks, audio samples -> audio queue
def audio_worker():
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
def summarize_llm(content):

    print("SUMMARIZING...")
    
    print(content)

    output = llm.create_chat_completion(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": content}
        ],
        temperature=0.2
    )
    return (output['choices'][0]['message']['content'])
