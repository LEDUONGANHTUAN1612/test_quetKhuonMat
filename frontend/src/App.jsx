import { useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/+$/, '');
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model/';
const SCAN_SAMPLES = 10;
const SCAN_INTERVAL_MS = 180;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function averageDescriptors(descriptors) {
  if (!descriptors.length) {
    throw new Error('Khong co descriptor de tinh trung binh.');
  }

  const size = descriptors[0].length;
  const acc = new Array(size).fill(0);

  for (const item of descriptors) {
    for (let i = 0; i < size; i += 1) {
      acc[i] += item[i];
    }
  }

  return acc.map((sum) => sum / descriptors.length);
}

export default function App() {
  const videoRef = useRef(null);
  const [status, setStatus] = useState('Dang tai model...');
  const [faceId, setFaceId] = useState('');
  const [modelReady, setModelReady] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let stream;

    async function setup() {
      try {
        await loadModels();
        setModelReady(true);
        setStatus('Model da san sang. Hay bat camera.');

        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        setStatus('Camera da bat. Bam Quet khuon mat.');
      } catch (error) {
        setStatus(`Loi khoi tao: ${error.message}`);
      }
    }

    setup();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  async function loadModels() {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
  }

  async function scanFace() {
    if (!videoRef.current || !modelReady) {
      setStatus('Model chua san sang hoac camera chua bat.');
      return;
    }

    setLoading(true);
    setFaceId('');

    try {
      const descriptors = [];
      setStatus('Dang lay nhieu mau khuon mat...');

      for (let i = 0; i < SCAN_SAMPLES; i += 1) {
        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          descriptors.push(Array.from(detection.descriptor));
        }

        if (i < SCAN_SAMPLES - 1) {
          await sleep(SCAN_INTERVAL_MS);
        }

        console.log(`Mau ${i + 1}/${SCAN_SAMPLES} da duoc xu ly. /${detection.descriptor}`);
      }

      if (!descriptors.length) {
        setStatus('Khong tim thay khuon mat. Hay thu lai voi anh sang tot hon.');
        return;
      }

      const averagedDescriptor = averageDescriptors(descriptors);

      const response = await fetch(`${API_BASE_URL}/api/identify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descriptor: averagedDescriptor }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Backend error');
      }

      const data = await response.json();
      setFaceId(data.faceId);
      if (data.matched) {
        setStatus(`Quet thanh cong. Da khop ID cu (distance=${data.distance}).`);
      } else {
        setStatus('Quet thanh cong. Tao ID moi.');
      }
    } catch (error) {
      setStatus(`Loi quet khuon mat: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <section className="card">
        <h1>Face ID Generator</h1>
        <p>
          Chuong trinh quet khuon mat qua browser va tao ma dinh danh duy nhat cho nguoi dung.
        </p>

        <video ref={videoRef} autoPlay playsInline muted className="video" />

        <button type="button" onClick={scanFace} disabled={!modelReady || loading}>
          {loading ? 'Dang quet...' : 'Quet khuon mat'}
        </button>

        <p className="status">Trang thai: {status}</p>

        {faceId && (
          <div className="result">
            <label>Ma dinh danh:</label>
            <code>{faceId}</code>
          </div>
        )}
      </section>
    </main>
  );
}