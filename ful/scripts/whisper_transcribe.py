#!/usr/bin/env python3
"""
Whisper Speech Recognition Worker for FUL.
Ported from Mark-LVI (faster-whisper CPU int8 with VAD and language detection).
Supports standalone CLI and persistent worker mode (JSON-RPC over stdin/stdout).
"""

import os
import sys
import json
import time

def _threads():
    try:
        n = os.cpu_count() or 4
    except Exception:
        n = 4
    return max(1, min(8, n // 2))

_model = None
_current_model_name = "base"

def get_whisper_model(model_name="base", device="cpu"):
    global _model, _current_model_name
    if _model is not None and _current_model_name == model_name:
        return _model

    try:
        from faster_whisper import WhisperModel
        compute_type = "float16" if device.startswith("cuda") else "int8"
        _model = WhisperModel(
            model_name,
            device=device,
            compute_type=compute_type,
            cpu_threads=_threads()
        )
        _current_model_name = model_name
        return _model
    except ImportError:
        # Fallback to openai-whisper if faster-whisper is not installed
        try:
            import whisper
            _model = whisper.load_model(model_name, device=device)
            _current_model_name = model_name
            return _model
        except ImportError:
            raise RuntimeError("Neither faster-whisper nor whisper is installed.")

def transcribe_audio(audio_path, model_name="base", language=None):
    if not os.path.exists(audio_path):
        return {"ok": False, "error": f"Audio file not found: {audio_path}"}

    t0 = time.time()
    try:
        model = get_whisper_model(model_name=model_name)
        
        # Check if it's faster_whisper or openai-whisper
        if hasattr(model, "transcribe") and hasattr(model, "model"):
            # faster-whisper
            segments, info = model.transcribe(
                audio_path,
                language=language or None,
                beam_size=1,
                vad_filter=True,
                condition_on_previous_text=False
            )
            text = " ".join(s.text.strip() for s in segments).strip()
            detected_lang = getattr(info, "language", "") or ""
            lang_prob = float(getattr(info, "language_probability", 0.0) or 0.0)
            elapsed = time.time() - t0
            return {
                "ok": True,
                "text": text,
                "language": detected_lang,
                "probability": lang_prob,
                "elapsed": round(elapsed, 3)
            }
        else:
            # openai-whisper
            kwargs = {"beam_size": 1, "fp16": False}
            if language:
                kwargs["language"] = language
            result = model.transcribe(audio_path, **kwargs)
            text = (result.get("text") or "").strip()
            detected_lang = result.get("language") or ""
            elapsed = time.time() - t0
            return {
                "ok": True,
                "text": text,
                "language": detected_lang,
                "probability": 1.0,
                "elapsed": round(elapsed, 3)
            }
    except Exception as e:
        return {"ok": False, "error": str(e), "elapsed": round(time.time() - t0, 3)}

def run_worker():
    print(json.dumps({"type": "ready", "service": "whisper"}), flush=True)

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            req_id = req.get("id")
            audio = req.get("audio")
            model = req.get("model", "base")
            lang = req.get("language")

            if not audio:
                res = {"ok": False, "error": "No audio path provided"}
            else:
                res = transcribe_audio(audio, model_name=model, language=lang)
            
            res["id"] = req_id
            print(json.dumps(res), flush=True)
        except Exception as e:
            print(json.dumps({"id": req.get("id") if 'req' in locals() else None, "ok": False, "error": str(e)}), flush=True)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--worker":
        run_worker()
    elif len(sys.argv) > 1:
        audio_file = sys.argv[1]
        model_arg = sys.argv[2] if len(sys.argv) > 2 else "base"
        out = transcribe_audio(audio_file, model_name=model_arg)
        print(json.dumps(out))
    else:
        print(json.dumps({"ok": False, "error": "Usage: whisper_transcribe.py <audio_file> OR whisper_transcribe.py --worker"}))
