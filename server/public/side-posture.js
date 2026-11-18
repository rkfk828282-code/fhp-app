// 옆모습 거북목 판별 (노트북 화면 › 실시간 자세 측정 › 휴대폰 카메라)
// 근거: 김종현(2023), 한국컴퓨터정보학회논문지 28(8), 87-93. 계산은 side-model.js
// 흐름: 휴대폰 옆모습 영상 → MediaPipe Pose 골격 → 12개 값 → 내 자세로 학습한 작은 신경망 → 바른 자세 / 거북목
// 자가 자세 체크용이며 진단이 아닙니다.
import { features, jitter, pickPoints, predict, readout, train } from "/side-model.js";
import { askNotify, fmtMin, neckTimer } from "/neck-alert.js";
import { bgLoop, grabFrame, setTabStatus } from "/bg-loop.js";
import { createLiveGauge } from "/live-gauge.js";

const $ = (id) => document.getElementById(id);
const GOOD = { t: "바른 자세", c: "#0B9B5A" }, BAD = { t: "거북목", c: "#B8432F" }, GRAY = "#5E6A64";
const REC_MS = 5000; // 한 번 녹화 5초
const AUG_TOTAL = 400; // 지터로 늘린 학습 데이터 수 (논문 값)
const K_SAMPLES = "neck.side.samples", K_MODEL = "neck.side.model";

const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

let pose = null, loading = null;
let running = false, stopLoop = null, busy = false, lastRun = 0, lastTick = 0;
let samples = store.get(K_SAMPLES, { good: [], bad: [] }); // 녹화한 골격 점 (H로 나눈 값)
let model = store.get(K_MODEL, null); // { net, valAcc, trainAcc, n, at }
let rec = null; // { kind, until }
const recent = [];
const stats = { good: 0, bad: 0 };
const live = createLiveGauge($("sideLiveGauge"), { title: "옆모습으로 본 지금 자세" });
live.set(null, "판별을 켜면 움직여요");
const neck = neckTimer($("sideMonAlert"), "귀가 어깨 위에 오도록 턱을 당기고 등을 펴 보세요."); // 5분 넘게 이어지면 알림

async function loadModel() {
  if (pose) return;
  if (loading) return loading;
  loading = (async () => {
    const { FilesetResolver, PoseLandmarker } = await import("/mediapipe/vision_bundle.mjs"); // 켤 때 처음 한 번만 불러옴
    const files = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
    const opts = (delegate) => ({ baseOptions: { modelAssetPath: "/mediapipe/models/pose_landmarker_lite.task", delegate }, runningMode: "VIDEO", numPoses: 1 });
    try { pose = await PoseLandmarker.createFromOptions(files, opts("GPU")); }
    catch { pose = await PoseLandmarker.createFromOptions(files, opts("CPU")); }
  })();
  try { await loading; } finally { loading = null; }
}

/* ===== 화면 ===== */
function setResult(text, color, sub = "", short = text) {
  $("sideMonResult").innerHTML = `<span class="mon-dot" style="background:${color}"></span><b style="color:${color}">${text}</b>${sub ? `<span class="small muted">${sub}</span>` : ""}`;
  const b = $("sideMonBadge");
  b.hidden = !running; b.textContent = short; b.style.background = color;
}
function setNums(r) {
  const sg = (v, d) => (v > 0 ? "+" : "") + v.toFixed(d);
  $("sideNumAng").textContent = r ? `${r.angle.toFixed(1)}°` : "–";
  $("sideNumGap").textContent = r ? sg(r.gap, 1) : "–";
  $("sideNumTilt").textContent = r ? `${sg(r.tilt, 0)}°` : "–";
}
function renderLearn() {
  $("sideCntGood").textContent = samples.good.length;
  $("sideCntBad").textContent = samples.bad.length;
  const enough = samples.good.length >= 20 && samples.bad.length >= 20;
  $("sideTrain").disabled = !enough || !!rec;
  $("sideRecGood").disabled = $("sideRecBad").disabled = !running || !!rec;
  $("sideRecGood").dataset.rec = rec?.kind === "good" ? "1" : "";
  $("sideRecBad").dataset.rec = rec?.kind === "bad" ? "1" : "";
  $("sideModelInfo").textContent = model
    ? `학습됨 · 확인 정확도 ${Math.round(model.valAcc * 100)}% (${model.n}개)`
    : enough ? "학습할 준비가 됐어요" : "두 자세를 20장면 이상씩 녹화해요";
}
function renderStats() {
  const total = stats.good + stats.bad;
  if (!total) { $("sideMonStats").innerHTML = `<span class="small muted">학습이 끝나면 자세별 시간이 쌓여요.</span>`; return; }
  const pg = (stats.good / total) * 100, pb = 100 - pg;
  $("sideMonStats").innerHTML = `
    <div class="mon-bar"><i style="width:${pg}%;background:${GOOD.c}"></i><i style="width:${pb}%;background:${BAD.c}"></i></div>
    <div class="mon-legend"><span><i style="background:${GOOD.c}"></i>바른 자세 ${Math.round(pg)}%</span><span><i style="background:${BAD.c}"></i>거북목 ${Math.round(pb)}%</span>
      <span class="muted">· 총 ${Math.round(total / 1000)}초</span></div>`;
}
function draw(W, H, pts, color) {
  const svg = $("sideMonOverlay");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  if (!pts) { svg.innerHTML = ""; return; }
  const s = Math.max(W, H) / 420, L = (a, b, c, dash = "") => `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${c}" stroke-width="${3 * s}" ${dash ? `stroke-dasharray="${dash}"` : ""} stroke-linecap="round"/>`;
  let g = "";
  g += L({ x: pts.shoulder.x, y: pts.shoulder.y }, { x: pts.shoulder.x, y: pts.ear.y - 30 * s }, "#ffffff99", `${7 * s} ${6 * s}`); // 어깨 위 수직선
  g += L(pts.nose, pts.neck, "#E04CC9"); // 코–목
  g += L(pts.ear, pts.shoulder, color); // 귀–어깨
  g += L(pts.eye, pts.ear, "#E04CC9");
  for (const [p, c, r] of [[pts.ear, "#F2C230", 7], [pts.shoulder, "#2EC4D6", 7], [pts.neck, "#ffffff", 5], [pts.nose, "#E04CC9", 5], [pts.eye, "#E04CC9", 4]])
    g += `<circle cx="${p.x}" cy="${p.y}" r="${r * s}" fill="${c}" stroke="#000" stroke-width="${1.5 * s}"/>`;
  svg.innerHTML = g;
}

/* ===== 반복 ===== */
// 한 번 돌기: 판별할 그림을 가져와서(다른 창을 봐도 됨) step 실행
async function tick() {
  if (!running || busy) return;
  if (performance.now() - lastRun < 95) return; // 약 10번/초
  busy = true;
  const frame = await grabFrame($("sideVideo"));
  try { if (frame && running) step(frame, performance.now()); }
  finally { if (frame) frame.close(); busy = false; }
}
function step(frame, now) {
  const dt = lastTick ? Math.min(1500, now - lastTick) : 0;
  lastRun = now; lastTick = now;
  const v = frame.img, W = frame.W, H = frame.H;
  let res;
  try { res = pose.detectForVideo(v, now); } catch { return; }
  const lm = res.landmarks && res.landmarks[0];
  const picked = lm && pickPoints(lm, W, H);
  if (!picked || !picked.ok) {
    draw(W, H, null); setNums(null); live.set(null, "옆모습에서 귀와 어깨가 보이게 해 주세요"); neck.update(false, now);
    setResult("옆모습에서 귀와 어깨가 보이게 해 주세요", GRAY, "휴대폰을 어깨 높이 옆쪽에 두고 상체가 나오게", "인식 안 됨");
    return;
  }
  const { pts } = picked;
  const r = readout(pts, H);
  setNums(r);
  // 학습 전에는 귀–어깨 각도로 대략 (40° 이하 = 0, 65° 이상 = 1)
  if (!model) live.set((r.angle - 40) / 25, `귀–어깨 ${r.angle.toFixed(0)}° · 학습하면 더 정확해져요`);

  // 녹화 중: 골격 점을 모음 (화면 높이로 나눠 저장)
  if (rec) {
    const norm = {}; for (const k of Object.keys(pts)) norm[k] = { x: pts[k].x / H, y: pts[k].y / H };
    samples[rec.kind].push(norm);
    const left = Math.max(0, rec.until - now);
    const k = rec.kind === "good" ? GOOD : BAD;
    setResult(`${k.t} 녹화 중… ${Math.ceil(left / 1000)}초`, k.c, rec.kind === "good" ? "귀가 어깨 위에 오게 바르게 앉아요" : "평소 화면 볼 때처럼 목을 앞으로 내밀어요", `녹화 ${Math.ceil(left / 1000)}`);
    draw(W, H, pts, k.c);
    if (left <= 0) { rec = null; store.set(K_SAMPLES, samples); }
    renderLearn();
    return;
  }
  if (!model) {
    draw(W, H, pts, "#ffffff");
    setResult("학습 전", GRAY, "아래에서 바른 자세·거북목 자세를 녹화하고 [학습하기]를 눌러요", "학습 전");
    return;
  }

  const p = predict(model.net, features(pts, H));
  live.set(1 - p, `거북목 확률 ${Math.round(p * 100)}%`);
  recent.push(p >= 0.5 ? "bad" : "good"); if (recent.length > 8) recent.shift();
  const nBad = recent.filter((x) => x === "bad").length;
  const label = nBad > recent.length / 2 ? "bad" : "good"; // 최근 장면 다수결 (깜빡임 줄이기)
  const k = label === "bad" ? BAD : GOOD;
  stats[label] += dt;
  const held = label === "bad" ? neck.elapsed(now) : 0;
  setResult(k.t, k.c, `거북목 확률 ${Math.round(p * 100)}%${held >= 60000 ? ` · ${fmtMin(held)}째` : ""}`);
  draw(W, H, pts, k.c);
  if (Math.round(now / 1000) !== Math.round((now - dt) / 1000)) renderStats();

  neck.update(label === "bad", now); // 5분 넘게 이어지면 알림
  setTabStatus("side", held >= 60000 ? `🐢 거북목 ${fmtMin(held)}째` : "");
}

/* ===== 학습 ===== */
function doTrain() {
  const data = [];
  for (const [kind, y] of [["good", 0], ["bad", 1]]) {
    const n = Math.ceil(AUG_TOTAL / 2);
    for (let i = 0; i < n; i++) {
      const base = samples[kind][i % samples[kind].length];
      const pts = i < samples[kind].length ? base : jitter(base, 1); // 원본 + 지터 복사본
      data.push({ f: features(pts, 1), y });
    }
  }
  $("sideModelInfo").textContent = "학습 중…";
  setTimeout(() => {
    const r = train(data);
    model = { net: r.net, valAcc: r.valAcc, trainAcc: r.trainAcc, n: r.n, at: Date.now() };
    store.set(K_MODEL, model);
    recent.length = 0; stats.good = stats.bad = 0;
    renderLearn(); renderStats();
  }, 30);
}

/* ===== 켜기 / 끄기 ===== */
function sideOn() { return !$("sideVideo").hidden && !!$("sideVideo").srcObject; }
let wanted = false; // 사용자가 켜 둠 (휴대폰이 아직 연결 전이면 연결되는 대로 시작)
function renderToggle() {
  const b = $("sideMonOnOff"), on = wanted || running;
  b.setAttribute("aria-pressed", String(on));
  b.querySelector(".sw").textContent = on ? "ON" : "OFF";
  b.disabled = false;
  $("sideMonBody").hidden = !running;
  $("sideMonHint").textContent = sideOn() ? "" : on
    ? "휴대폰 카메라가 연결되면 바로 시작해요 (위 QR이나 코드로 연결)"
    : "휴대폰 카메라를 연결하고 켜 주세요";
  renderLearn();
}
async function start() {
  if (running || !sideOn()) return;
  running = true; renderToggle();
  setResult("자세 판별 준비 중… (처음 한 번 불러오기)", GRAY, "", "준비 중");
  try { await loadModel(); }
  catch { running = false; wanted = false; renderToggle(); $("sideMonHint").textContent = "자세 판별 모델을 불러오지 못했어요. 새로고침 후 다시 켜 주세요."; return; }
  if (!running) return;
  $("sideMonOverlay").removeAttribute("hidden");
  live.reset();
  lastTick = 0; renderStats(); renderLearn();
  stopLoop = bgLoop(tick, 100, 500); // 안 보일 때는 0.5초마다
}
function stop(keepWanted = false) {
  if (!keepWanted) wanted = false;
  running = false; if (stopLoop) { stopLoop(); stopLoop = null; } setTabStatus("side", ""); live.set(null, "판별을 켜면 움직여요"); rec = null; neck.reset();
  $("sideMonOverlay").setAttribute("hidden", ""); $("sideMonOverlay").innerHTML = ""; $("sideMonBadge").hidden = true; $("sideMonAlert").hidden = true;
  renderToggle();
}

$("sideMonOnOff").addEventListener("click", () => {
  if (wanted || running) { stop(); return; }
  wanted = true; askNotify(); renderToggle();
  if (sideOn()) start(); else loadModel().catch(() => {}); // 기다리는 동안 모델 미리 불러오기
});
$("sideRecGood").addEventListener("click", () => { rec = { kind: "good", until: performance.now() + REC_MS }; renderLearn(); });
$("sideRecBad").addEventListener("click", () => { rec = { kind: "bad", until: performance.now() + REC_MS }; renderLearn(); });
$("sideTrain").addEventListener("click", doTrain);
$("sideClear").addEventListener("click", () => {
  if (!confirm("녹화한 자세와 학습 결과를 지울까요?")) return;
  samples = { good: [], bad: [] }; model = null; store.del(K_SAMPLES); store.del(K_MODEL);
  stats.good = stats.bad = 0; renderLearn(); renderStats();
});
$("sideMonReset").addEventListener("click", () => { stats.good = stats.bad = 0; renderStats(); });
$("sideMonAlertClose").addEventListener("click", () => { $("sideMonAlert").hidden = true; });

window.addEventListener("side-on", () => { renderToggle(); if (wanted) start(); });
window.addEventListener("side-off", () => stop(true)); // 휴대폰이 끊겨도 켜 둔 상태는 유지 → 다시 연결되면 이어서

renderToggle();

// 테스트용 (콘솔에서 확인)
window.__sidePosture = { get model() { return model; }, get samples() { return samples; } };
