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
    '''
    if ON is true:
        set the audio_on event
        add "Listening" status
    else:
      clear the audio_on event
      remove "Listening" status
    '''
    print(on)
    if on:
        audio_on.set()
        add_status("Listening")
    else:
        audio_on.clear()
        remove_status("Listening")


# make the llm summaries, llm queue -> database
def llm_worker():
    '''
    Preconditions:
    - llm_queue is initialized and may contain messages
    - database connection is established for storing entities

    Pseudocode:
    while True
        msg = item from llm queue (wait here if queue is empty)
        summaryString = run llm on msg
        TRY
            parse json
        EXCEPT error
            fallback to a different json object
        store summary in database

    Postconditions:
    - All messages from llm_queue are processed
    - Entities are added to the database based on LLM output
    '''
    while True:
        msg = llm_queue.get()

        print('SUMMARIZING')
        add_status("Processing")

        summaryString = process_entry(msg).strip()
        print(summaryString)

        try:
            summaryJSON = json.loads(summaryString)
        except:
            summaryJSON = {"type": "note", "content": summaryString}

        add_entity(
            type=summaryJSON.get("type", "note"),
            content=summaryJSON.get("content", summaryString),
        )
        remove_status("Processing")


# combine all of the text, text queue -> llm queue
def create_text_chunks_worker():
    '''
    Preconditions:
    - text_queue is initialized and may contain text strings

    Pseudocode:
    while True
        text = data from text queue (wait here if queue is empty)
        add to current message string
        IF message length > MESSAGE_CHUNK_SIZE
            send to llm queue for processing
            reset current message

    Postconditions:
    - text from text_queue is accumulated into chunks
    - chunks exceeding MESSAGE_CHUNK_SIZE are sent to llm_queue
    - each chunk is logged as an entry with type "capture"
    - function runs indefinitely, processing text as it arrives in the queue
    '''
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
def transcribe_audio_worker():
    '''
    Preconditions:
    - transcription_queue is initialized and contains audio numpy arrays
    - whisper model is initialized
    - text_queue is initialized for output

    Pseudocode:
    while True
        audio_np = data from transcription queue
        segments = data from whisper transcription
        IF text was detected
            add to text queue to be chunked

    Postconditions:
    - audio from transcription_queue is transcribed to text
    - non empty transcribed text is added to text_queue
    - function runs indefinitely, processing audio as it arrives in queue
    '''
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
    '''
    Preconditions:
    - audio_queue is initialized and contains audio chunks (numpy arrays)

    Pseudocode:
    initialize empty audio_data list and samples_collected counter
    calculate target_samples as SAMPLE_RATE * CHUNK_DURATION
    while samples_collected < target_samples:
        get a chunk from audio_queue
        append chunk to audio_data
        add chunk length to samples_collected
    concatenate audio_data into a numpy array and flatten
    put the audio_np into transcription_queue

    Postconditions:
    - audio chunks from audio_queue are collected until target_samples is reached
    - collected chunks are concatenated into a single numpy array
    - the audio array is placed in transcription_queue
    - function runs indefinitely, processing audio chunks as they arrive in queue
    '''
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


# method to process entry text using the LLM
def process_entry(content):
    '''
    Preconditions:
    - llm model is loaded
    - content is a non-empty string

    Pseudocode:
    create a chat completion with system prompt and user content
    return the LLM response content

    Postconditions:
    - LLM is called with the provided content and system prompt
    - Returns the content of the LLM response message
    '''

    print("PROCESSING ENTRY...")
    print(content)
    add_status("Processing")

    output = llm.create_chat_completion(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": content}
        ],
        temperature=0.2
    )
    remove_status("Processing")
    return (output['choices'][0]['message']['content'])


# method to query the LLM
def query_llm(content):
    '''
    Preconditions:
    - llm is loaded
    - content is a non-empty string containing query and context

    Pseudocode:
    create a chat completion with assistant system prompt and user content
    return the LLM response content

    Postconditions:
    - LLM is called with the provided content
    - Returns the content of the LLM's response message
    '''

    print("QUERYING LLM...")
    print(content)

    output = llm.create_chat_completion(
        messages=[
            {"role": "system", "content": "You are a helpful assistant. Answer the user's query based on the provided context."},
            {"role": "user", "content": content}
        ],
        temperature=0.7
    )
    return (output['choices'][0]['message']['content'])
