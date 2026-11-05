/**
 * FUL Camera Vision Engine - Ported & Enhanced from F.U.L
 * Enables real-time camera vision, snapshot recording, gesture/object recognition,
 * and visual companion awareness.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

function getCameraFolder() {
  const pictures = path.join(os.homedir(), 'Pictures');
  const camDir = path.join(pictures, 'FUL Camera');
  try { fs.mkdirSync(camDir, { recursive: true }); } catch {}
  return camDir;
}

function saveSnapshot(base64Data) {
  if (!base64Data) return { ok: false, error: 'No image data provided' };
  try {
    const rawB64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const buf = Buffer.from(rawB64, 'base64');
    const folder = getCameraFolder();
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const filename = `snapshot_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.jpg`;
    const targetPath = path.join(folder, filename);
    fs.writeFileSync(targetPath, buf);
    return {
      ok: true,
      path: targetPath,
      filename,
      message: `Snapshot saved to Pictures/FUL Camera/${filename}`
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function buildVisionPrompt(mode = 'describe', customQuery = '') {
  if (customQuery && customQuery.trim()) {
    return `Look at this live camera frame from the user's webcam. Answer the user's question directly in a friendly companion tone (1-2 sentences): "${customQuery.trim()}".`;
  }

  switch (mode) {
    case 'holding':
    case 'object':
      return 'Look closely at what the person is holding or showing to the camera. Identify the exact object, book, gadget, or paper, and describe it clearly in 1-2 friendly sentences.';
    case 'read_text':
    case 'ocr':
      return 'Read, transcribe, and summarize any text, code, handwritten notes, or book pages shown in this webcam image accurately.';
    case 'posture':
    case 'health':
      return 'Check the user posture, distance from the screen, and room lighting. Give a brief, caring companion tip if they need to straighten their back or drink water.';
    case 'describe':
    default:
      return 'You are FUL, an AI companion seeing the user through their webcam. Describe what you see in the room and what the user is doing in 1-2 warm, natural, and observant sentences.';
  }
}

class CameraVision {
  constructor() {}
  saveSnapshot(base64Data, filename) {
    const res = saveSnapshot(base64Data);
    return res.ok ? res.message : `Failed to save snapshot: ${res.error}`;
  }
  buildVisionPrompt(mode, customQuery) {
    return buildVisionPrompt(mode, customQuery);
  }
  getCameraFolder() {
    return getCameraFolder();
  }
}

module.exports = {
  CameraVision,
  getCameraFolder,
  saveSnapshot,
  buildVisionPrompt
};
