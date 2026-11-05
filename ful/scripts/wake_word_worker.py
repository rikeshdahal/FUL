#!/usr/bin/env python3
"""
Real-time Neural Wake Word Worker for FUL.
Ported from Mark-LVI (openwakeword ONNX inference thread + sounddevice mic stream).
Eliminates audio latency, runs in background, respects EchoGuard state file.
"""

import os
import sys
import json
import time
import queue
import argparse
import threading
import numpy as np

def read_state_file(state_file):
    if not state_file or not os.path.exists(state_file):
        return {}
    try:
        with open(state_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}

def main():
    parser = argparse.ArgumentParser(description="FUL Neural Wake Word Worker")
    parser.add_argument("--state-file", default="", help="Path to speech-state.json")
    parser.add_argument("--threshold", type=float, default=0.5, help="Wake score threshold (0.0 - 1.0)")
    parser.add_argument("--models", nargs="*", default=["hey_jarvis"], help="Models to load")
    args = parser.parse_args()

    try:
        import sounddevice as sd
        from openwakeword.model import Model
    except ImportError as e:
        print(json.dumps({"type": "error", "message": f"Dependency missing: {e}"}), flush=True)
        sys.exit(1)

    # Initialize openwakeword model
    try:
        # Load available models
        model = Model(wakeword_models=args.models, inference_framework="onnx")
        loaded_names = list(model.models.keys())
        print(json.dumps({"type": "ready", "models": loaded_names, "threshold": args.threshold}), flush=True)
    except Exception as e:
        print(json.dumps({"type": "error", "message": f"Failed to load wake models: {e}"}), flush=True)
        sys.exit(1)

    audio_queue = queue.Queue(maxsize=60)
    running = True

    def audio_callback(indata, frames, time_info, status):
        if not running:
            return
        try:
            # Flatten to 1D int16 array
            data = indata[:, 0].copy() if getattr(indata, "ndim", 1) > 1 else indata.copy()
            audio_queue.put_nowait(data)
        except queue.Full:
            pass
        except Exception:
            pass

    def drain_queue():
        try:
            while True:
                audio_queue.get_nowait()
        except Exception:
            pass

    def worker_loop():
        nonlocal running
        last_state_check = 0
        is_suppressed = False

        while running:
            try:
                frame = audio_queue.get(timeout=0.5)
            except queue.Empty:
                continue

            now = time.time()
            if now - last_state_check > 0.08:
                last_state_check = now
                st = read_state_file(args.state_file)
                
                # Check listen gate
                if st.get("listen") is False:
                    is_suppressed = True
                elif st.get("isSpeaking") is True:
                    is_suppressed = True
                elif st.get("capturing") is True:
                    is_suppressed = True
                elif st.get("suppressingUntil") and (time.time() * 1000) < float(st.get("suppressingUntil")):
                    is_suppressed = True
                else:
                    is_suppressed = False

            if is_suppressed:
                continue

            try:
                scores = model.predict(np.asarray(frame, dtype=np.int16))
                detected_model = None
                max_score = 0.0

                if isinstance(scores, dict):
                    for k, v in scores.items():
                        score_val = float(v)
                        if score_val >= args.threshold and score_val > max_score:
                            max_score = score_val
                            detected_model = k

                if detected_model:
                    drain_queue()
                    print(json.dumps({
                        "type": "wake",
                        "model": detected_model,
                        "score": round(max_score, 4),
                        "timestamp": round(time.time(), 3)
                    }), flush=True)
                    # Pause 1.2s to prevent immediate re-triggering
                    time.sleep(1.2)
            except Exception as ex:
                pass

    worker_thread = threading.Thread(target=worker_loop, daemon=True, name="WakeWordInferenceThread")
    worker_thread.start()

    # Open microphone at 16,000 Hz mono 16-bit
    try:
        stream = sd.InputStream(
            samplerate=16000,
            channels=1,
            dtype='int16',
            blocksize=1280,
            callback=audio_callback
        )
        with stream:
            # Keep process alive until stdin closed or process killed
            while running:
                line = sys.stdin.readline()
                if not line:
                    break
    except Exception as e:
        print(json.dumps({"type": "error", "message": f"Microphone stream error: {e}"}), flush=True)
    finally:
        running = False
        print(json.dumps({"type": "bye"}), flush=True)

if __name__ == "__main__":
    main()

