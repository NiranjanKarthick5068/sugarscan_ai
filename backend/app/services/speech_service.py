import os
import tempfile
import whisper
from fastapi import UploadFile

# Load whisper model (base or tiny for speed)
# We load it lazily to avoid blocking startup
_whisper_model = None

def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        print("Loading Whisper model (tiny)...")
        _whisper_model = whisper.load_model("tiny")
    return _whisper_model

async def transcribe_audio(file: UploadFile) -> str:
    model = get_whisper_model()
    
    # Save uploaded file to a temporary file
    suffix = os.path.splitext(file.filename)[1] if file.filename else ".m4a"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # Transcribe
        result = model.transcribe(tmp_path)
        return result.get("text", "").strip()
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
