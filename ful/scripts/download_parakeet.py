import os
import sys
import urllib.request
import time

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models", "parakeet-unified-en-0.6b")
BASE_URL = "https://huggingface.co/csukuangfj2/sherpa-onnx-nemo-parakeet-unified-en-0.6b-int8-non-streaming/resolve/main"

FILES = [
    "tokens.txt",
    "decoder.int8.onnx",
    "joiner.int8.onnx",
    "encoder.int8.onnx"
]

def download_file(filename):
    os.makedirs(MODEL_DIR, exist_ok=True)
    dest_path = os.path.join(MODEL_DIR, filename)
    
    if os.path.exists(dest_path) and os.path.getsize(dest_path) > 1000:
        print(f"[Parakeet] {filename} already exists ({os.path.getsize(dest_path)} bytes), skipping.")
        return True

    url = f"{BASE_URL}/{filename}"
    print(f"[Parakeet] Downloading {filename} from HuggingFace...")
    
    start_time = time.time()
    last_print = 0

    def report(count, block_size, total_size):
        nonlocal last_print
        now = time.time()
        if now - last_print > 2 or count * block_size >= total_size:
            last_print = now
            downloaded_mb = count * block_size / (1024 * 1024)
            total_mb = total_size / (1024 * 1024) if total_size > 0 else 0
            percent = (count * block_size / total_size * 100) if total_size > 0 else 0
            print(f"[Parakeet] {filename}: {downloaded_mb:.1f} MB / {total_mb:.1f} MB ({percent:.1f}%)")

    headers = {'User-Agent': 'Mozilla/5.0'}
    req = urllib.request.Request(url, headers=headers)
    
    temp_path = dest_path + ".tmp"
    with urllib.request.urlopen(req) as resp, open(temp_path, "wb") as f:
        total_size = int(resp.headers.get('Content-Length', 0))
        block_size = 1024 * 512
        count = 0
        while True:
            chunk = resp.read(block_size)
            if not chunk:
                break
            f.write(chunk)
            count += 1
            report(count, block_size, total_size)

    if os.path.exists(dest_path):
        os.remove(dest_path)
    os.rename(temp_path, dest_path)
    print(f"[Parakeet] Successfully saved {filename} in {time.time() - start_time:.1f}s.")
    return True

def main():
    print(f"[Parakeet] Target directory: {MODEL_DIR}")
    for f in FILES:
        download_file(f)
    print("[Parakeet] All model files downloaded successfully!")

if __name__ == "__main__":
    main()

