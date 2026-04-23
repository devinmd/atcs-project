# whisper settings
MODEL_SIZE = "base"  # tiny, base, small, medium, large-v3
COMPUTE_TYPE = "float32"  # int8, int16, float16, float32
SAMPLE_RATE = 16000
CHUNK_DURATION = 30  # seconds
BEAM_SIZE = 10  # 1=fastest, 10=best accuracy

# system prompt for llm
SYSTEM_PROMPT = """
You are a helpful assistant, your only job is to act as a brain and notetaker, remember, summarize, and extract to-do items or useful insights from the user's input.
If the user is describing a task, todo, or reminder, extract it as a todo with optional deadline/date. If the user is making a note or idea, extract it as a note.
If the user is clearly asking a question to you, answer their question using relevant information/context and ensure the type is query_response.
Set priority_rank as an integer from 0 to 5, where 5 is highest priority and 0 is lowest/no priority.
Only ever respond with JSON formatted as follows. It must be wrapped in an array even if there is only 1 response object.
Do not use the context to generate new items, only to support the new entry data as background context or to answer questions.
{"type": "todo" | "note" , "content": "text here", "status": "status if applicable, otherwise empty string", "date": "deadline or date if applicable, otherwise empty string", "priority_rank": 0-5}
"""

QUERY_PROMPT = """
You are a helpful assistant. Answer the user's query concisely based on the provided context.
"""


#
MESSAGE_CHUNK_SIZE = 100

#
DB_FILE = "data.db"
PORT = 5500
