import { emitAction } from "./input-bus.js";

const VISION_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const OPEN_THRESHOLD = 0.35;
const CLOSE_THRESHOLD = 0.2;

// Reports true only on the closed -> open change. The gap between the two
// thresholds keeps a hovering value from flickering, and a mouth held open
// never fires again until it has closed.
export function createOpenEdgeDetector(
  openThreshold = OPEN_THRESHOLD,
  closeThreshold = CLOSE_THRESHOLD
) {
  let isOpen = false;
  return {
    update(value) {
      if (!isOpen && value > openThreshold) {
        isOpen = true;
        return true;
      }
      if (isOpen && value < closeThreshold) {
        isOpen = false;
      }
      return false;
    },
    get isOpen() {
      return isOpen;
    },
  };
}

let video = null;
let stream = null;
let landmarker = null;
let running = false;

export async function initMouthInput({ onOpenChange } = {}) {
  if (running) return;

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera API not available");
  }

  const { FaceLandmarker, FilesetResolver } = await import(
    `${VISION_URL}/vision_bundle.mjs`
  );
  const fileset = await FilesetResolver.forVisionTasks(`${VISION_URL}/wasm`);
  landmarker = await FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_URL },
    runningMode: "VIDEO",
    numFaces: 1,
    outputFaceBlendshapes: true,
  });

  stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 320, height: 240 },
  });
  video = document.createElement("video");
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await video.play();

  const detector = createOpenEdgeDetector();
  let lastVideoTime = -1;
  let lastReportedOpen = false;
  running = true;

  function loop() {
    if (!running) return;
    if (video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      const result = landmarker.detectForVideo(video, performance.now());
      const jawOpen = result.faceBlendshapes?.[0]?.categories.find(
        (c) => c.categoryName === "jawOpen"
      )?.score;

      if (jawOpen !== undefined) {
        if (detector.update(jawOpen)) emitAction("mouth");
        if (detector.isOpen !== lastReportedOpen) {
          lastReportedOpen = detector.isOpen;
          onOpenChange?.(lastReportedOpen);
        }
      }
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

export function stopMouthInput() {
  running = false;
  stream?.getTracks().forEach((t) => t.stop());
  landmarker?.close();
  video = null;
  stream = null;
  landmarker = null;
}
