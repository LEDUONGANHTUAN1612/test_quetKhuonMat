import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
const ID_SALT = process.env.ID_SALT || 'local-dev-salt';
const MATCH_THRESHOLD = Number(process.env.MATCH_THRESHOLD || 0.46);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const PROFILE_FILE = path.join(DATA_DIR, 'profiles.json');

let profiles = [];

const allowedOrigins = CORS_ORIGIN.split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser clients (no Origin header) and configured browser origins.
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = origin.replace(/\/+$/, '');
      if (allowedOrigins.includes('*') || allowedOrigins.includes(normalizedOrigin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
  })
);
app.use(express.json({ limit: '1mb' }));

function normalizeDescriptor(descriptor) {
  if (!Array.isArray(descriptor) || descriptor.length !== 128) {
    throw new Error('Descriptor must be an array with 128 values.');
  }

  const normalized = descriptor.map((value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      throw new Error('Descriptor contains invalid number.');
    }
    return Math.round(n * 1000) / 1000;
  });

  return normalized;
}

function l2Distance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

function createFaceId(descriptor) {
  const seed = `${ID_SALT}:${descriptor.join(',')}:${crypto.randomUUID()}`;
  const hash = crypto.createHash('sha256').update(seed).digest('hex');
  return `FACE-${hash.slice(0, 24).toUpperCase()}`;
}

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const data = await fs.readFile(PROFILE_FILE, 'utf8');
    const parsed = JSON.parse(data);
    profiles = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      profiles = [];
      await fs.writeFile(PROFILE_FILE, JSON.stringify(profiles, null, 2));
      return;
    }
    throw error;
  }
}

async function persistProfiles() {
  await fs.writeFile(PROFILE_FILE, JSON.stringify(profiles, null, 2));
}

function findBestProfile(descriptor) {
  let best = null;
  for (const profile of profiles) {
    const distance = l2Distance(descriptor, profile.centroid);
    if (!best || distance < best.distance) {
      best = { profile, distance };
    }
  }
  return best;
}

function updateCentroid(profile, newDescriptor) {
  const previousSamples = Number(profile.samples || 1);
  const total = previousSamples + 1;

  profile.centroid = profile.centroid.map((value, index) => {
    const merged = (value * previousSamples + newDescriptor[index]) / total;
    return Math.round(merged * 1000) / 1000;
  });
  profile.samples = total;
  profile.updatedAt = new Date().toISOString();
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'face-id-backend' });
});

app.post('/api/identify', (req, res) => {
  try {
    const { descriptor } = req.body;
    const normalized = normalizeDescriptor(descriptor);
    const best = findBestProfile(normalized);

    if (best && best.distance <= MATCH_THRESHOLD) {
      updateCentroid(best.profile, normalized);
      persistProfiles().catch((error) => {
        console.error('Persist failed after match:', error);
      });

      res.json({
        faceId: best.profile.faceId,
        matched: true,
        distance: Number(best.distance.toFixed(4)),
      });
      return;
    }

    const profile = {
      faceId: createFaceId(normalized),
      centroid: normalized,
      samples: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    profiles.push(profile);
    persistProfiles().catch((error) => {
      console.error('Persist failed after insert:', error);
    });

    res.json({
      faceId: profile.faceId,
      matched: false,
      distance: best ? Number(best.distance.toFixed(4)) : null,
    });
  } catch (error) {
    res.status(400).json({
      message: 'Cannot create face ID from provided data.',
      details: error.message,
    });
  }
});

async function start() {
  await ensureStore();
  app.listen(PORT, () => {
    console.log(`Face ID backend listening at http://localhost:${PORT}`);
    console.log(`Loaded ${profiles.length} stored face profile(s).`);
  });
}

start().catch((error) => {
  console.error('Server startup failed:', error);
  process.exit(1);
});