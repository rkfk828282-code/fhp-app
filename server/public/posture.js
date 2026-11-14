// 웹캠 자세 모니터링 (노트북 화면 › 실시간 자세 측정 › 정면 웹캠)
// 근거: 최홍석·김종남(2026), 「인공지능 기반 자세 추정 모델을 활용한 실시간 거북목 증후군 검출 시스템」,
//       융합신호처리학회논문지 27(4), 213-220.
// - 얼굴 삼각형(코끝·왼눈·오른눈) 면적 변화율 ΔS, 어깨 기준선 대비 수직 변위 ΔY, 수평 변위 ΔX
// - 기준 자세 보정(캘리브레이션) 후 임계값으로 5가지 자세 분류
// - 논문 임계값: 면적 10%, 어깨 수직 -11, 어깨 수평 15 (FHD 영상 픽셀 기준 → 화면 크기에 비례해 조정)
// 자가 자세 체크용이며 진단이 아닙니다.
import { FilesetResolver, FaceLandmarker, PoseLandmarker } from "/mediapipe/vision_bundle.mjs";

const $ = (id) => document.getElementById(id);
const LABEL = {
  CORRECT: { t: "바른 자세", c: "#0B9B5A" },
  TEXT_NECK: { t: "거북목", c: "#B8432F" },
  LYING: { t: "뒤로 누움", c: "#E0882F" },
  LEFT_TILT: { t: "왼쪽 기울어짐", c: "#3A7BD5" },
  RIGHT_TILT: { t: "오른쪽 기울어짐", c: "#3A7BD5" },
};
const ORDER = ["CORRECT", "TEXT_NECK", "LYING", "LEFT_TILT", "RIGHT_TILT"];
const DEFAULT_TH = { area: 10, ver: -11, hor: 15 };
const ALERT_MS = 10000; // 거북목이 10초 넘게 이어지면 경고
const REALERT_MS = 30000; // 경고를 다시 띄우는 간격

const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

let face = null, pose = null, loading = null;
let running = false, raf = 0, lastRun = 0, lastTick = 0;
let calib = store.get("neck.monitor.calib", null); // { S, L:{x,y}, R:{x,y} }
let calibrating = null; // { until, samples: [] }
let th = { ...DEFAULT_TH, ...store.get("neck.monitor.th", {}) };
const recent = []; // 최근 판별 결과 (깜빡임 줄이기)
const stats = Object.fromEntries(ORDER.map((k) => [k, 0]));
let neckSince = null, lastAlert = 0;

/* ===== 계산 (논문 식 1~5) ===== */
const area = (a, b, c) => Math.abs(a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y)) / 2; // 식 (1) 신발끈 공식

function classify(cur, k) {
  const { S, L, R } = cur;
  const m = (calib.R.y - calib.L.y) / (calib.R.x - calib.L.x); // 식 (2) 어깨 기준선 기울기
  const dS = ((S - calib.S) / calib.S) * 100; // 식 (3) 면적 변화율(%)
  const dYL = L.y - (m * (L.x - calib.L.x) + calib.L.y); // 식 (4)
  const dYR = R.y - (m * (R.x - calib.L.x) + calib.L.y);
  const dXL = L.x - calib.L.x; // 식 (5)
  const dXR = R.x - calib.R.x;
  const Tver = th.ver * k, Thor = th.hor * k;
  let label;
  if (dS > th.area) label = "TEXT_NECK"; // 얼굴이 카메라 쪽으로 다가옴
  else if (dS <= -th.area) label = "LYING"; // 얼굴이 멀어짐 (뒤로 젖힘)
  // 좌우 기울기를 어깨 수직 변위보다 먼저 봄: 옆으로 기울면 한쪽 어깨가 올라가 거북목으로 잘못 나오는 것을 막음
  else if (dXL >= Thor && dXR >= 0) label = "LEFT_TILT";
  else if (dXR <= -Thor && dXL <= 0) label = "RIGHT_TILT";
  else if (dYL < Tver || dYR < Tver) label = "TEXT_NECK"; // 얼굴 크기는 그대로인데 어깨가 기준선보다 올라감(웅크림)
  else label = "CORRECT";
  return { label, dS, dYL, dYR, dXL, dXR, m };
}

/* ===== 모델 ===== */
async function loadModels() {
  if (face && pose) return;
  if (loading) return loading;
  loading = (async () => {
    const files = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
    const make = async (Kind, path, extra) => {
      try { return await Kind.createFromOptions(files, { baseOptions: { modelAssetPath: path, delegate: "GPU" }, runningMode: "VIDEO", ...extra }); }
      catch { return await Kind.createFromOptions(files, { baseOptions: { modelAssetPath: path, delegate: "CPU" }, runningMode: "VIDEO", ...extra }); }
    };
    face = await make(FaceLandmarker, "/mediapipe/models/face_landmarker.task", { numFaces: 1 });
    pose = await make(PoseLandmarker, "/mediapipe/models/pose_landmarker_lite.task", { numPoses: 1 });
  })();
  try { await loading; } finally { loading = null; }
}

/* ===== 화면 ===== */
function setResult(text, color, sub = "", short = text) {
  $("monResult").innerHTML = `<span class="mon-dot" style="background:${color}"></span><b style="color:${color}">${text}</b>${sub ? `<span class="small muted">${sub}</span>` : ""}`;
  const badge = $("monBadge");
  badge.hidden = !running;
  badge.textContent = short; badge.style.background = color;
}
function renderStats() {
  const total = ORDER.reduce((s, k) => s + stats[k], 0);
  if (!total) { $("monStats").innerHTML = `<span class="small muted">기준 자세를 저장하면 자세별 시간이 쌓여요.</span>`; return; }
  const pct = (k) => (stats[k] / total) * 100;
  $("monStats").innerHTML = `
    <div class="mon-bar">${ORDER.map((k) => `<i style="width:${pct(k)}%;background:${LABEL[k].c}" title="${LABEL[k].t}"></i>`).join("")}</div>
    <div class="mon-legend">${ORDER.filter((k) => stats[k]).map((k) => `<span><i style="background:${LABEL[k].c}"></i>${LABEL[k].t} ${Math.round(pct(k))}%</span>`).join("")}
      <span class="muted">· 총 ${Math.round(total / 1000)}초</span></div>`;
}
function setNums(r) {
  const f = (v, d = 0) => (v === null || v === undefined ? "–" : (v > 0 ? "+" : "") + v.toFixed(d));
  $("monNumS").textContent = r ? f(r.dS, 1) + "%" : "–";
  $("monNumL").textContent = r ? `${f(r.dYL)} / ${f(r.dXL)}` : "–";
  $("monNumR").textContent = r ? `${f(r.dYR)} / ${f(r.dXR)}` : "–";
}
function draw(W, H, pts, r) {
  const svg = $("monOverlay");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  if (!pts) { svg.innerHTML = ""; return; }
  const s = W / 640;
  let g = `<polygon points="${pts.nose.x},${pts.nose.y} ${pts.eL.x},${pts.eL.y} ${pts.eR.x},${pts.eR.y}" fill="#F2C23055" stroke="#F2C230" stroke-width="${2 * s}"/>`;
  if (calib && r) { // 어깨 기준선 (기준 자세)
    const y0 = calib.L.y + r.m * (0 - calib.L.x), y1 = calib.L.y + r.m * (W - calib.L.x);
    g += `<line x1="0" y1="${y0}" x2="${W}" y2="${y1}" stroke="#2EC4D6" stroke-width="${2 * s}" stroke-dasharray="${8 * s} ${6 * s}"/>`;
  }
  g += `<line x1="${pts.L.x}" y1="${pts.L.y}" x2="${pts.R.x}" y2="${pts.R.y}" stroke="#ffffffaa" stroke-width="${2 * s}"/>`;
  for (const p of [pts.L, pts.R]) g += `<circle cx="${p.x}" cy="${p.y}" r="${6 * s}" fill="#2EC4D6" stroke="#000" stroke-width="${1.5 * s}"/>`;
  for (const p of [pts.nose, pts.eL, pts.eR]) g += `<circle cx="${p.x}" cy="${p.y}" r="${4 * s}" fill="#F2C230" stroke="#000" stroke-width="${1.5 * s}"/>`;
  svg.innerHTML = g;
}
function beep() {
  try {
    const a = beep.ctx || (beep.ctx = new (window.AudioContext || window.webkitAudioContext)());
    [0, 0.22].forEach((t) => { const o = a.createOscillator(), gn = a.createGain(); o.frequency.value = 660; gn.gain.value = 0.1; o.connect(gn); gn.connect(a.destination); o.start(a.currentTime + t); o.stop(a.currentTime + t + 0.15); });
  } catch {}
}

/* ===== 반복 ===== */
function tick() {
  if (!running) return;
  raf = requestAnimationFrame(tick);
  const now = performance.now();
  if (now - lastRun < 50) return; // 약 20 FPS (논문과 비슷한 속도)
  const dt = lastTick ? Math.min(500, now - lastTick) : 0;
  lastRun = now; lastTick = now;
  const v = $("frontVideo");
  if (!v || v.readyState < 2 || !v.videoWidth) return;
  const W = v.videoWidth, H = v.videoHeight;
  let fr, pr;
  try { fr = face.detectForVideo(v, now); pr = pose.detectForVideo(v, now); } catch { return; }
  const f = fr.faceLandmarks && fr.faceLandmarks[0], p = pr.landmarks && pr.landmarks[0];
  const ok = f && p && (p[11].visibility ?? 1) > 0.5 && (p[12].visibility ?? 1) > 0.5;
  if (!ok) { draw(W, H, null); setResult("얼굴과 양쪽 어깨가 보이게 앉아 주세요", "#5E6A64", "", "인식 안 됨"); setNums(null); neckSince = null; $("monAlert").hidden = true; return; }

  const P = (l) => ({ x: l.x * W, y: l.y * H });
  const hasIris = f.length >= 478;
  const pts = { nose: P(f[1]), eR: P(f[hasIris ? 468 : 33]), eL: P(f[hasIris ? 473 : 263]), L: P(p[11]), R: P(p[12]) };
  const cur = { S: area(pts.nose, pts.eL, pts.eR), L: pts.L, R: pts.R };

  // 기준 자세 저장 중: 3초 평균
  if (calibrating) {
    calibrating.samples.push(cur);
    const left = Math.max(0, calibrating.until - now);
    setResult(`기준 자세 저장 중… ${Math.ceil(left / 1000)}초`, "#0B9B5A", "바른 자세로 화면을 정면으로 봐 주세요", `기준 저장 ${Math.ceil(left / 1000)}`);
    draw(W, H, pts, null);
    if (left <= 0) {
      const n = calibrating.samples.length, avg = (fn) => calibrating.samples.reduce((s, x) => s + fn(x), 0) / n;
      calib = { S: avg((x) => x.S), L: { x: avg((x) => x.L.x), y: avg((x) => x.L.y) }, R: { x: avg((x) => x.R.x), y: avg((x) => x.R.y) }, at: Date.now() };
      store.set("neck.monitor.calib", calib);
      calibrating = null; recent.length = 0;
      ORDER.forEach((k) => { stats[k] = 0; });
      $("monCalibInfo").textContent = "방금 저장했어요";
    }
    return;
  }
  if (!calib) { draw(W, H, pts, null); setResult("기준 자세를 저장해 주세요", "#5E6A64", "바른 자세로 앉아 [기준 자세 저장]을 눌러요", "기준 자세 필요"); setNums(null); return; }

  const r = classify(cur, W / 1920);
  recent.push(r.label); if (recent.length > 8) recent.shift();
  const counts = {}; recent.forEach((x) => { counts[x] = (counts[x] || 0) + 1; });
  const label = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0]; // 최근 0.4초 다수결
  stats[label] += dt;
  setResult(LABEL[label].t, LABEL[label].c);
  setNums(r);
  draw(W, H, pts, r);
  if (Math.round(now / 1000) !== Math.round((now - dt) / 1000)) renderStats();

  // 거북목 경고
  if (label === "TEXT_NECK") {
    neckSince = neckSince ?? now;
    if (now - neckSince >= ALERT_MS && now - lastAlert >= REALERT_MS) { lastAlert = now; beep(); $("monAlert").hidden = false; }
  } else { neckSince = null; $("monAlert").hidden = true; }
}

/* ===== 켜기 / 끄기 ===== */
function webcamOn() { return !$("frontVideo").hidden && !!$("frontVideo").srcObject; }
function renderToggle() {
  const b = $("monOnOff");
  b.setAttribute("aria-pressed", String(running));
  b.querySelector(".sw").textContent = running ? "ON" : "OFF";
  b.disabled = !webcamOn() && !running;
  $("monBody").hidden = !running;
  $("monHint").textContent = webcamOn() ? "" : "웹캠을 켜면 쓸 수 있어요";
}
async function start() {
  if (running || !webcamOn()) return;
  running = true; renderToggle();
  setResult("자세 판별 준비 중… (처음 한 번 약 20MB 불러오기)", "#5E6A64", "", "준비 중");
  try { await loadModels(); }
  catch { running = false; renderToggle(); $("monHint").textContent = "자세 판별 모델을 불러오지 못했어요. 새로고침 후 다시 켜 주세요."; return; }
  if (!running) return;
  $("monOverlay").removeAttribute("hidden");
  lastTick = 0; renderStats();
  $("monCalibInfo").textContent = calib ? `저장된 기준 자세 사용 중 (${new Date(calib.at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })})` : "";
  raf = requestAnimationFrame(tick);
}
function stop() {
  running = false; cancelAnimationFrame(raf); calibrating = null; neckSince = null;
  $("monOverlay").setAttribute("hidden", ""); $("monOverlay").innerHTML = ""; $("monBadge").hidden = true; $("monAlert").hidden = true;
  renderToggle();
}

$("monOnOff").addEventListener("click", () => (running ? stop() : start()));
$("monCalib").addEventListener("click", () => { calibrating = { until: performance.now() + 3000, samples: [] }; $("monCalibInfo").textContent = ""; });
$("monReset").addEventListener("click", () => { ORDER.forEach((k) => { stats[k] = 0; }); renderStats(); });
$("monAlertClose").addEventListener("click", () => { $("monAlert").hidden = true; });

// 판별 기준 조정 (논문 기본값)
const inputs = { area: $("thArea"), ver: $("thVer"), hor: $("thHor") };
const fillTh = () => Object.entries(inputs).forEach(([k, el]) => { el.value = th[k]; });
fillTh();
Object.entries(inputs).forEach(([k, el]) => el.addEventListener("change", () => {
  const v = Number(el.value); if (Number.isFinite(v)) { th[k] = v; store.set("neck.monitor.th", th); }
}));
$("thReset").addEventListener("click", () => { th = { ...DEFAULT_TH }; store.set("neck.monitor.th", th); fillTh(); });

// 웹캠이 켜지면(MY의 '항상 켜기'가 켜져 있을 때) 자동 시작, 웹캠이 꺼지면 멈춤
window.addEventListener("webcam-on", () => {
  renderToggle();
  if (typeof S !== "undefined" && S.monitorAuto) start();
});
window.addEventListener("webcam-off", () => { stop(); });
renderToggle();
