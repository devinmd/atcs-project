
import vosk
import pyaudio
import json

# model_path = "model/vosk-model-small-en-us-0.15" # small model is less accurate (not really usable)
model_path = "model/vosk-model-en-us-0.22"  # much more accurate

model = vosk.Model(model_path)

# freq=16000Hz
rec = vosk.KaldiRecognizer(model, 16000)

# open microphone stream
p = pyaudio.PyAudio()
stream = p.open(format=pyaudio.paInt16,
                channels=1,
                rate=16000,
                input=True,
                frames_per_buffer=8192)

while True:
    data = stream.read(4096)  # read in chunks of 4096 bytes
    if rec.AcceptWaveform(data):
        result = json.loads(rec.Result())
        recognized_text = result["text"]
        print(recognized_text)