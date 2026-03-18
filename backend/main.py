import threading
import time
from llama_cpp import Llama
from faster_whisper import WhisperModel
import sounddevice as sd
import sys
from store import create_session_id
from server import start_socket_server
from config import *
from workers import *


# load whisper model
model = WhisperModel(MODEL_SIZE, compute_type=COMPUTE_TYPE)


# initialize the LLM
llm = Llama(
    model_path="./models/llama3.2/Llama-3.2-8B-Instruct.IQ4_XS.gguf",  # takes ~10 seconds
    n_gpu_layers=-1,
    n_ctx=1024,
    verbose=False
)


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
    threading.Thread(target=audio_worker, daemon=True).start()
    threading.Thread(target=transcribe_audio_worker, daemon=True).start()
    threading.Thread(target=create_text_chunks_worker, daemon=True).start()
    threading.Thread(target=llm_worker, daemon=True).start()
    time.sleep(0.5)
    add_status("Listening")
    audio_loop()
