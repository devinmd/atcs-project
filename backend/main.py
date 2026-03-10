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
CHUNK_DURATION = 30  # seconds
BEAM_SIZE = 10  # 1=fastest, 10=best accuracy


# load whisper model
model = WhisperModel(MODEL_SIZE, compute_type=COMPUTE_TYPE)


LLAMA_SYSTEM_PROMPT = """
You are a helpful assistant connected to a speech-to-text system. Your only job is to act as a brain and notetaker, remember, summarize, and extract to-do items from user speech, nothing else.
If the user is expressing a clear request, intent, or idea, respond with a concise summary (1 sentence max).
If the user clearly and explicitly states a to-do item, extract and summarize that as a to-do item.
Only use data & information from the users prompt.
You are always summarizing or taking notes of the content you are given.
Only ever respond with JSON formatted as follows: {"type": "summary" | "todo" | "other" | "remember"| "note", "text": "concise summary of the users speech here"}
"""

MESSAGE_CHUNK_SIZE = 100

# initialize the LLM
llm = Llama(
    model_path="./models/llama3.2/Llama-3.2-8B-Instruct.IQ4_XS.gguf",  # takes ~10 seconds
    # model_path="./models/llama3.2/Llama-3.2-1B-Instruct-f16.gguf", # takes a few seconds to generate answer
    n_gpu_layers=-1,
    n_ctx=1024,
    verbose=False
)

# method to summarize text using the LLM


def summarize_text(text):

    print("SUMMARIZING...")

    output = llm.create_chat_completion(
        messages=[
            {"role": "system", "content": LLAMA_SYSTEM_PROMPT},
            {"role": "user", "content": text}
        ],
        temperature=0.1
    )
    return (output['choices'][0]['message']['content'])


audio_queue = queue.Queue()


def audio_callback(indata, frames, time, status):
    # runs after every sample is collected and puts it into a queue
    if status:
        print(status, file=sys.stderr)
    audio_queue.put(indata.copy())


session_id = create_session_id()


print("INITIALIZED")

current_message = ""


def audio_loop():
    global current_message

    with sd.InputStream(
        samplerate=SAMPLE_RATE,
        channels=1,
        callback=audio_callback,
        dtype="float32"
    ):

        try:
            while True:

                add_status("Listening")
                print("LISTENING...")

                # collect audio for CHUNK_DURATION seconds
                audio_data = []
                samples_collected = 0
                target_samples = SAMPLE_RATE * CHUNK_DURATION

                while samples_collected < target_samples:
                    # collects audio samples super quickly until we have enough for the chunk duration
                    chunk = audio_queue.get()
                    audio_data.append(chunk)
                    samples_collected += len(chunk)
                    # print(samples_collected / SAMPLE_RATE)

                remove_status("Listening")
                add_status("Transcribing")
                print("TRANSCRIBING", samples_collected / SAMPLE_RATE, "seconds")
                # concatenate audio chunks
                audio_np = np.concatenate(audio_data, axis=0).flatten()
                # transcribe with whisper
                segments, info = model.transcribe(
                    audio_np, beam_size=BEAM_SIZE, language="en", condition_on_previous_text=True)

                for segment in segments:
                    text = segment.text.strip()
                    if text:
                        current_message += " " + text
                        print("DETECTED:", text)
                        current_message = current_message.strip()

                remove_status("Transcribing")

                if len(current_message) > MESSAGE_CHUNK_SIZE:
                    # if message length exceeds threshold, summarize and store
                    # this is blocking, BUT, the audio callback continues to run continuously collecting chunks so it is recording during this as well
                    add_status("Processing")
                    print("PROCESSING SPEECH", samples_collected /
                          SAMPLE_RATE, "seconds")
                    print("FULL MESSAGE TO SUMMARIZE:", current_message)
                    insert_speech(text=current_message, session_id=session_id)

                    summaryString = summarize_text(current_message).strip()
                    time.sleep(1)
                    try:
                        summaryJSON = json.loads(summaryString)
                    except json.JSONDecodeError:
                        print("Failed to parse JSON:", summaryString)
                        summaryJSON = {"type": "other",
                                       "text": summaryString}

                    print("SUMMARY:", summaryJSON)

                    insert_summary(type=summaryJSON["type"],
                                   text=summaryJSON["text"], session_id=session_id)
                    current_message = ""
                    remove_status("Processing")
                    print("DONE PROCESSING SPEECH")

        except KeyboardInterrupt:
            print("\nStopped")


if __name__ == "__main__":
    # run socketio server in a daemon thread so the main thread can run the audio loop
    server_thread = threading.Thread(target=start_socket_server, daemon=True)
    server_thread.start()
    time.sleep(0.5)

    # main thread runs the blocking audio loop, it can make sio.emit() calls safely because of threading async_mode
    audio_loop()
