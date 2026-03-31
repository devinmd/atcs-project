import threading
import time
from llama_cpp import Llama
from faster_whisper import WhisperModel
import sounddevice as sd
import sys
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


# runs after every sample is collected and puts it into a queue
def audio_callback(indata, frames, time, status):
    if status:
        print(status, file=sys.stderr)
    if audio_on.is_set():
        audio_queue.put(indata.copy())


print("INITIALIZED")


def audio_loop():
    while True:

        audio_on.wait()
        print('opening mic')
        try:
            with sd.InputStream(
                samplerate=SAMPLE_RATE,
                channels=1,
                callback=audio_callback,
                dtype="float32"
            ):
                print("AUDIO STREAM ACTIVE")

                while audio_on.is_set():
                    time.sleep(0.1)

            print("closing mic")
        except Exception as e:
            print(f"Audio Error: {e}")
            audio_on.clear()


if __name__ == "__main__":
    # run services as daemon threads so the main thread can run the audio loop
    threading.Thread(target=start_socket_server, daemon=True).start()
    threading.Thread(target=audio_worker, daemon=True).start()
    threading.Thread(target=transcribe_audio_worker, daemon=True).start()
    threading.Thread(target=create_text_chunks_worker, daemon=True).start()
    threading.Thread(target=llm_worker, daemon=True).start()
    threading.Thread(target=audio_loop, daemon=True).start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        sys.exit()
    # time.sleep(0.5)
    # audio_loop()
