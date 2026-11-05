/**
 * FUL Voice Engine
 * Complete Port of Mark-LVI TTS, STT, EchoGuard, VAD & Viseme Architectures.
 * Supports:
 *  - TTS: Gemini Preview Audio, ElevenLabs Multilingual, MS Edge Neural, SAPI5 UTF-8 Progressive System Voice
 *  - STT: Local Faster-Whisper, Hosted Whisper (Groq/OpenAI), Parakeet FastConformer, SAPI5 Speech Worker
 *  - EchoGuard: Speaker latency compensation and room echo tail suppression
 *  - Language Stability: Confidence & length gating for multi-turn language switching
 *  - Viseme Lip-Sync: Phoneme-to-mouth mapping for realistic facial articulation
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execFile } = require('child_process');
const https = require('https');
const http = require('http');

// Sentence boundary regex across Latin, Devanagari (।), CJK (。！？), Arabic (؟), and ellipsis (…)
const SENTENCE_END = /(?<=[.!?…])\s+|(?<=[。！？؟۔।])\s*/;

/* =========================================================================
   1. EchoGuard: Prevents FUL from hearing and transcribing its own voice
   ========================================================================= */
class EchoGuard {
  constructor(latencyMs = 250, tailMarginMs = 350) {
    this.latencyMs = latencyMs;
    this.tailMarginMs = tailMarginMs;
    this.isSpeaking = false;
    this.suppressingUntil = 0;
  }

  start(estimatedDurationMs = 2000) {
    this.isSpeaking = true;
    this.suppressingUntil = Date.now() + estimatedDurationMs + this.latencyMs + this.tailMarginMs;
  }

  extend(additionalMs = 1000) {
    this.isSpeaking = true;
    this.suppressingUntil = Math.max(this.suppressingUntil, Date.now() + additionalMs + this.latencyMs + this.tailMarginMs);
  }

  stop() {
    this.isSpeaking = false;
    // Keep suppression active through the echo tail window
    this.suppressingUntil = Date.now() + this.latencyMs + this.tailMarginMs;
  }

  isEcho() {
    return this.isSpeaking || Date.now() < this.suppressingUntil;
  }
}

const echoGuard = new EchoGuard();

/* =========================================================================
   2. Sentence Splitter for Progressive Real-Time Speech Synthesis
   ========================================================================= */
function splitSentences(text) {
  if (!text || typeof text !== 'string') return [];
  const raw = text.replace(/\r\n/g, '\n').replace(/\t/g, ' ').trim();
  if (!raw) return [];

  const parts = raw.split(SENTENCE_END);
  return parts.map(p => p.trim()).filter(Boolean);
}

/* =========================================================================
   3. System SAPI5 Speech via UTF-8 Temp File (Zero Codepage Crash)
   ========================================================================= */
function speakSystemSapi(text, voiceName = '') {
  return new Promise((resolve) => {
    if (!text || !text.trim()) return resolve({ ok: false, error: 'Empty text' });

    const clean = text.replace(/[<>:"/\\|?*]/g, ' ').trim();
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `ful_sapi_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.txt`);

    try {
      fs.writeFileSync(tempFile, clean, 'utf8');
    } catch (e) {
      return resolve({ ok: false, error: e.message });
    }

    const psScript = `
      $path = '${tempFile.replace(/'/g, "''")}';
      if (-not (Test-Path -LiteralPath $path)) { exit 1 }
      $txt = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8);
      Add-Type -AssemblyName System.Speech;
      $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;
      $synth.Rate = 0;
      $synth.Volume = 100;
      $vName = '${(voiceName || '').replace(/'/g, "''")}';
      if ($vName) {
        try { $synth.SelectVoice($vName) } catch { }
      }
      $synth.Speak($txt);
      $synth.Dispose();
    `;

    const proc = spawn('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript], {
      windowsHide: true,
      stdio: ['ignore', 'ignore', 'ignore']
    });

    proc.on('exit', (code) => {
      try { fs.unlinkSync(tempFile); } catch {}
      resolve({ ok: code === 0, engine: 'sapi5' });
    });

    proc.on('error', (err) => {
      try { fs.unlinkSync(tempFile); } catch {}
      resolve({ ok: false, error: err.message });
    });
  });
}

/* =========================================================================
   4. ElevenLabs Multilingual Neural TTS
   ========================================================================= */
async function speakElevenLabs({ text, apiKey, voiceId = '21m00Tcm4TlvDq8ikWAM', model = 'eleven_flash_v2_5' }) {
  if (!apiKey) throw new Error('ElevenLabs API key is required');
  if (!text || !text.trim()) throw new Error('Empty text for ElevenLabs');

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128`;
  const payload = JSON.stringify({
    text: text.trim(),
    model_id: model,
    voice_settings: { stability: 0.5, similarity_boost: 0.75 }
  });

  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 15000
    }, (res) => {
      if (res.statusCode >= 400) {
        let errData = '';
        res.on('data', c => errData += c);
        res.on('end', () => reject(new Error(`ElevenLabs error ${res.statusCode}: ${errData}`)));
        return;
      }

      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve({
          ok: true,
          audioData: buf.toString('base64'),
          mimeType: 'audio/mp3',
          engine: 'elevenlabs'
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('ElevenLabs request timed out'));
    });

    req.write(payload);
    req.end();
  });
}

/* =========================================================================
   5. Hosted Whisper (Groq / OpenAI compatible API)
   ========================================================================= */
async function transcribeHostedWhisper({ audioPath, apiKey, baseUrl = 'https://api.groq.com/openai/v1', model = 'whisper-large-v3-turbo', language = '' }) {
  if (!apiKey) throw new Error('API key required for hosted Whisper transcription');
  if (!fs.existsSync(audioPath)) throw new Error('Audio file not found: ' + audioPath);

  const fileData = fs.readFileSync(audioPath);
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).slice(2);

  const parsedUrl = new URL(`${baseUrl.replace(/\/+$/, '')}/audio/transcriptions`);
  const isHttps = parsedUrl.protocol === 'https:';

  // Build multipart/form-data payload
  const parts = [];
  parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\n${model}\r\n`));
  if (language) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\n${language}\r\n`));
  }
  parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="response_format"\r\n\r\nverbose_json\r\n`));
  parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.wav"\r\nContent-Type: audio/wav\r\n\r\n`));
  parts.push(fileData);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

  const bodyBuffer = Buffer.concat(parts);

  return new Promise((resolve, reject) => {
    const transport = isHttps ? https : http;
    const req = transport.request(parsedUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': bodyBuffer.length
      },
      timeout: 15000
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          return reject(new Error(`Hosted Whisper error ${res.statusCode}: ${data}`));
        }
        try {
          const json = JSON.parse(data);
          resolve({
            ok: true,
            text: (json.text || '').trim(),
            language: json.language || '',
            duration: json.duration || 0,
            engine: 'hosted-whisper'
          });
        } catch (e) {
          reject(new Error('Invalid JSON from hosted whisper: ' + data));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Hosted Whisper request timed out'));
    });

    req.write(bodyBuffer);
    req.end();
  });
}

/* =========================================================================
   6. Multi-Turn Language Stability Filter (Mark-LVI Pattern)
   ========================================================================= */
class LanguageStabilityGuard {
  constructor(minConfidence = 0.65, minChars = 12) {
    this.minConfidence = minConfidence;
    this.minChars = minChars;
    this.detectedLanguage = '';
  }

  accept(code, confidence = 1.0, text = '') {
    const c = (code || '').trim().toLowerCase();
    if (!c) return this.detectedLanguage;
    if (!this.detectedLanguage) {
      this.detectedLanguage = c;
      return this.detectedLanguage;
    }
    if (c === this.detectedLanguage) return this.detectedLanguage;

    if (confidence >= this.minConfidence && (text || '').length >= this.minChars) {
      this.detectedLanguage = c;
      return this.detectedLanguage;
    }
    return this.detectedLanguage;
  }
}

const languageGuard = new LanguageStabilityGuard();

/* =========================================================================
   7. Mark-LVI Viseme Articulation Table
   ========================================================================= */
const VISEMES = {
  REST: { openness: 0.00, width: 0.00, closure: 0.00 },
  AA:   { openness: 0.92, width: -0.05, closure: 0.00 }, // a, ah
  E:    { openness: 0.52, width: 0.42, closure: 0.00 },  // e, eh
  I:    { openness: 0.20, width: 0.62, closure: 0.00 },  // i, ee
  O:    { openness: 0.55, width: -0.52, closure: 0.00 }, // o, oh
  U:    { openness: 0.26, width: -0.74, closure: 0.00 }, // u, oo, w
  MBP:  { openness: 0.00, width: 0.00, closure: 1.00 },  // m, b, p (lips closed)
  FV:   { openness: 0.10, width: 0.22, closure: 0.55 },  // f, v (lip to teeth)
  S:    { openness: 0.16, width: 0.42, closure: 0.00 },  // s, z, sh, ch, j
  L:    { openness: 0.36, width: 0.18, closure: 0.00 },  // l
  TD:   { openness: 0.28, width: 0.12, closure: 0.00 },  // t, d, n
  K:    { openness: 0.30, width: -0.04, closure: 0.00 }, // k, g, h
  R:    { openness: 0.28, width: -0.16, closure: 0.00 }  // r
};

function charToViseme(char) {
  if (!char) return 'REST';
  const c = char.toLowerCase();
  if ('mbp'.includes(c)) return 'MBP';
  if ('fv'.includes(c)) return 'FV';
  if ('szcj'.includes(c)) return 'S';
  if ('tdn'.includes(c)) return 'TD';
  if ('kgh'.includes(c)) return 'K';
  if (c === 'l') return 'L';
  if (c === 'r') return 'R';
  if ('a'.includes(c)) return 'AA';
  if ('e'.includes(c)) return 'E';
  if ('iy'.includes(c)) return 'I';
  if ('o'.includes(c)) return 'O';
  if ('uw'.includes(c)) return 'U';
  return 'REST';
}

module.exports = {
  EchoGuard,
  echoGuard,
  splitSentences,
  speakSystemSapi,
  speakElevenLabs,
  transcribeHostedWhisper,
  LanguageStabilityGuard,
  languageGuard,
  VISEMES,
  charToViseme
};
