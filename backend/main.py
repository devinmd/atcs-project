from llama_cpp import Llama
import threading
from faster_whisper import WhisperModel
import sounddevice as sd
import numpy as np
import queue
import sys
from store import create_session_id, insert_speech, insert_summary
from server import app

# whisper settings
MODEL_SIZE = "base"  # tiny, base, small, medium, large-v3
SAMPLE_RATE = 16000
CHUNK_DURATION = 10  # seconds

# load whisper model
model = WhisperModel(MODEL_SIZE, compute_type="float32")
print("whisper model loaded")

LLAMA_SYSTEM_PROMPT = """
You are a helpful assistant connected to a speech-to-text system whose only job is to remember, summarize, and extract to-do items from user speech, nothing else.
If the user is expressing a clear request, intent, or idea, respond with a concise summary (1 sentence max).
If the user clearly and explicitly states a to-do item, extract and summarize that as a to-do item.
Only use data & information from the users prompt.
You are always summarizing or taking notes of the content you are given.
"""

MESSAGE_CHUNK_SIZE = 50

# initialize the LLM
llm = Llama(
    model_path="./models/llama3.2/Llama-3.2-8B-Instruct.f16.gguf",
    # n_gpu_layers=-1, # Uncomment to use GPU acceleration
    # n_ctx=2048, # Uncomment to increase the context window
    verbose=False
)

# method to summarize text using the LLM


def summarize_text(text):

    output = llm.create_chat_completion(
        messages=[
            {"role": "system", "content": LLAMA_SYSTEM_PROMPT},
            {"role": "user", "content": text}
        ],
        temperature=0.1
    )
    return (output['choices'][0]['message']['content'])


# open microphone stream
audio_queue = queue.Queue()


def audio_callback(indata, frames, time, status):
    if status:
        print(status, file=sys.stderr)
    audio_queue.put(indata.copy())


session_id = create_session_id()
current_message = ""

print("INITIALIZED")

if __name__ == "__main__":
    # start flask server in a background thread
    flask_thread = threading.Thread(
        target=lambda: app.run(port=5000, debug=False), daemon=True)
    flask_thread.start()

    with sd.InputStream(
        samplerate=SAMPLE_RATE,
        channels=1,
        callback=audio_callback,
        dtype="float32"
    ):
        print("LISTENING")

        try:
            while True:
                audio_data = []

                # collect audio for CHUNK_DURATION seconds
                for _ in range(int(SAMPLE_RATE / 1024 * CHUNK_DURATION)):
                    audio_data.append(audio_queue.get())

                audio_np = np.concatenate(audio_data, axis=0).flatten()
                segments, info = model.transcribe(audio_np, beam_size=5)

                for segment in segments:
                    text = segment.text.strip()
                    if text:
                        current_message += " " + text
                        print("Detected:", text)

                if len(current_message) > MESSAGE_CHUNK_SIZE:
                    # if message length exceeds threshold, summarize and store
                    print("FULL MESSAGE TO SUMMARIZE:", current_message)
                    insert_speech(text=current_message, session_id=session_id)
                    summary = summarize_text(current_message)
                    print("SUMMARY:", summary)
                    insert_summary(text=summary, session_id=session_id)
                    current_message = ""

        except KeyboardInterrupt:
            print("\nStopped")
