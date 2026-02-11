
import vosk
import pyaudio
import json
from llama_cpp import Llama
from store import insert_speech

VOSK_MODEL_PATH = "models/vosk-model-en-us-0.22"

SYSTEM_PROMPT = """
You are a helpful assistant connected to a speech-to-text system whose only job is to remember, summarize, and extract to-do items from user speech, nothing else.
If the user is expressing a clear request, intent, or idea, respond with a concise summary (1 sentence max). 
If the user clearly and explicitly states a to-do item, extract and summarize that as a to-do item.
Do not give input, feedback, or suggestions on anything. 
Do not add any content/information.
Do not make suggestions or add commentary, simply summarize the input text
"""

# initialize the LLM
llm = Llama(
    model_path="./models/llama3.2/Llama-3.2-1B-Instruct-f16.gguf",
    # n_gpu_layers=-1, # Uncomment to use GPU acceleration
    # n_ctx=2048, # Uncomment to increase the context window
    verbose=False
)


# method to summarize text using the LLM
def summarize_text(text):

    output = llm.create_chat_completion(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": text}
        ],
        temperature=0.1
    )
    return (output['choices'][0]['message']['content'])


# initialize Vosk model and recognizer
vosk_model = vosk.Model(VOSK_MODEL_PATH)
rec = vosk.KaldiRecognizer(vosk_model, 16000)


# open microphone stream
p = pyaudio.PyAudio()
stream = p.open(format=pyaudio.paInt16,
                channels=1,
                rate=16000,
                input=True,
                frames_per_buffer=8192)


print("READY")


# main app loop
while True:
    data = stream.read(4096, exception_on_overflow=False)
    if rec.AcceptWaveform(data):
        result = json.loads(rec.Result())
        recognized_text = result["text"]
        if recognized_text:
            # insert speech to db
            insert_speech(
                text=recognized_text
            )

            print("SPEECH", recognized_text)
            summary = summarize_text(recognized_text)
            print("SUMMARY", summary)
