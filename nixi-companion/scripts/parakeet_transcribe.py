import os
import sys
import json
import time
import sherpa_onnx
import soundfile as sf
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "models", "parakeet-unified-en-0.6b")

encoder_path = os.path.join(MODEL_DIR, "encoder.int8.onnx")
decoder_path = os.path.join(MODEL_DIR, "decoder.int8.onnx")
joiner_path = os.path.join(MODEL_DIR, "joiner.int8.onnx")
tokens_path = os.path.join(MODEL_DIR, "tokens.txt")

_recognizer = None

def get_recognizer():
    global _recognizer
    if _recognizer is not None:
        return _recognizer

    if not (os.path.exists(encoder_path) and os.path.exists(tokens_path)):
        raise FileNotFoundError(f"Parakeet Unified EN 0.6B model not found in {MODEL_DIR}")

    # Initialize sherpa-onnx OfflineRecognizer for NeMo FastConformer-RNNT
    _recognizer = sherpa_onnx.OfflineRecognizer.from_transducer(
        encoder=encoder_path,
        decoder=decoder_path,
        joiner=joiner_path,
        tokens=tokens_path,
        model_type="nemo_transducer",
        feature_dim=128,
        decoding_method="greedy_search",
        num_threads=4,
        provider="cpu"
    )
    return _recognizer

def resample_if_needed(audio, sample_rate, target_sr=16000):
    if sample_rate == target_sr:
        return audio
    # Resample using scipy or linear interpolation
    try:
        from scipy import signal
        num_samples = int(len(audio) * float(target_sr) / sample_rate)
        return signal.resample(audio, num_samples).astype(np.float32)
    except Exception:
        # Fallback linear interpolation
        duration = len(audio) / sample_rate
        new_length = int(duration * target_sr)
        return np.interp(np.linspace(0, len(audio), new_length), np.arange(len(audio)), audio).astype(np.float32)

def transcribe_audio_file(audio_path):
    if not os.path.exists(audio_path):
        return {"ok": False, "error": f"File not found: {audio_path}"}
    
    t0 = time.time()
    try:
        rec = get_recognizer()
        audio, sr = sf.read(audio_path, dtype="float32")
        
        # If stereo or multi-channel, average to mono
        if len(audio.shape) > 1:
            audio = np.mean(audio, axis=1)

        # Ensure 16 kHz sample rate
        if sr != 16000:
            audio = resample_if_needed(audio, sr, 16000)
            sr = 16000

        stream = rec.create_stream()
        stream.accept_waveform(sr, audio)
        rec.decode_stream(stream)
        
        text = stream.result.text.strip()
        elapsed = time.time() - t0
        return {"ok": True, "text": text, "elapsed": round(elapsed, 3)}
    except Exception as e:
        return {"ok": False, "error": str(e), "elapsed": round(time.time() - t0, 3)}

def run_worker():
    # Send ready signal
    print(json.dumps({"type": "ready", "model": "Parakeet Unified EN 0.6B"}), flush=True)
    
    # Pre-warm model in memory
    try:
        get_recognizer()
        print(json.dumps({"type": "loaded", "status": "Model loaded into memory"}), flush=True)
    except Exception as e:
        print(json.dumps({"type": "error", "message": str(e)}), flush=True)

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            req_id = req.get("id")
            audio_path = req.get("audio")
            if not audio_path:
                print(json.dumps({"id": req_id, "ok": False, "error": "No audio path provided"}), flush=True)
                continue
            
            res = transcribe_audio_file(audio_path)
            res["id"] = req_id
            print(json.dumps(res), flush=True)
        except Exception as e:
            print(json.dumps({"ok": False, "error": str(e)}), flush=True)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--worker":
        run_worker()
    elif len(sys.argv) > 1:
        res = transcribe_audio_file(sys.argv[1])
        print(json.dumps(res, indent=2))
    else:
        print("Usage: python parakeet_transcribe.py <audio_path> OR python parakeet_transcribe.py --worker")

