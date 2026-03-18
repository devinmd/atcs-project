# whisper settings
MODEL_SIZE = "base"  # tiny, base, small, medium, large-v3
COMPUTE_TYPE = "float32"  # int8, int16, float16, float32
SAMPLE_RATE = 16000
CHUNK_DURATION = 30  # seconds
BEAM_SIZE = 10  # 1=fastest, 10=best accuracy

# system prompt for llm
SYSTEM_PROMPT = """
You are a helpful assistant connected to a speech-to-text system. Your only job is to act as a brain and notetaker, remember, summarize, and extract to-do items from user speech, nothing else.
If the user is describing a task, todo, or reminder, extract it as a todo with optional deadline
If the user is making a note or idea, extract it as a note
Only use data & information from the users prompt.
Only ever respond with JSON formatted as follows: {"type": "todo" | "note", "text": "data here", "deadline": "deadline if applicable"}
"""

MESSAGE_CHUNK_SIZE = 100
