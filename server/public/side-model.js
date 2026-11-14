// 옆모습 골격으로 거북목 판별 — 계산 부분 (화면과 분리, 테스트하기 쉽게)
// 근거: 김종현(2023), 「An Accurate Forward Head Posture Detection using Human Pose and Skeletal Data Learning」,
//       한국컴퓨터정보학회논문지 28(8), 87-93.
// - 옆모습에서 코·목·어깨·눈·귀 키포인트를 뽑고, 코를 원점으로 정규화 (논문 III-1)
// - 코를 뺀 4개 점(목·어깨·눈·귀)의 X,Y 8개 + 추가 4개 = 12개 값 (논문 III-2)
//   ① 귀와 어깨의 X 차이 Γ  ② 목과 어깨의 Y 차이  ③ 코–목 거리  ④ 코–목 직선과 수직선의 각도
// - 은닉층 10개씩 3층, 출력 2개(바른 자세 / 거북목) softmax, 학습률 0.01, Adam (논문 III-3)
// - 골격 위치에 지터를 더해 학습 데이터를 늘림 (논문: 400개)
// 바뀐 점: 논문은 OpenPose BODY-25, 여기는 브라우저에서 도는 MediaPipe Pose(33점). 목 = 양 어깨 가운데.

// MediaPipe Pose 번호
const IDX = { nose: 0, eyeL: 2, eyeR: 5, earL: 7, earR: 8, shL: 11, shR: 12 };

/** MediaPipe 결과(0~1 좌표) → 화면 픽셀 점 5개. 카메라 쪽을 향한 몸 쪽(귀가 잘 보이는 쪽)을 고름 */
export function pickPoints(lm, W, H) {
  const vis = (i) => lm[i].visibility ?? 1;
  const left = vis(IDX.earL) + vis(IDX.shL) >= vis(IDX.earR) + vis(IDX.shR);
  const P = (i) => ({ x: lm[i].x * W, y: lm[i].y * H });
  const sL = P(IDX.shL), sR = P(IDX.shR);
  const pts = {
    nose: P(IDX.nose),
    neck: { x: (sL.x + sR.x) / 2, y: (sL.y + sR.y) / 2 },
    shoulder: left ? sL : sR,
    eye: P(left ? IDX.eyeL : IDX.eyeR),
    ear: P(left ? IDX.earL : IDX.earR),
  };
  const ok = vis(IDX.nose) > 0.5 && vis(left ? IDX.earL : IDX.earR) > 0.3 && vis(left ? IDX.shL : IDX.shR) > 0.5;
  return { pts, ok, side: left ? "L" : "R" };
}

/** 12개 학습 값. 코 원점, 화면 높이로 나눠 크기를 맞추고, 얼굴이 향한 쪽을 +X로 맞춤 */
export function features(pts, H) {
  const dir = pts.nose.x >= pts.ear.x ? 1 : -1; // 코가 귀보다 앞 = 얼굴 방향
  const rel = (p) => [((p.x - pts.nose.x) * dir) / H, (p.y - pts.nose.y) / H];
  const [nx, ny] = rel(pts.neck), [sx, sy] = rel(pts.shoulder), [ex, ey] = rel(pts.eye), [ax, ay] = rel(pts.ear);
  const gap = ax - sx; // ① Γ: 귀가 어깨보다 앞으로 나온 정도 (+ = 앞)
  const neckSh = ny - sy; // ② 목–어깨 Y 차이
  const dist = Math.hypot(nx, ny); // ③ 코–목 거리
  const tilt = (Math.atan2(-nx, ny) * 180) / Math.PI; // ④ 코–목 직선과 수직선 각도 (+ = 코가 목보다 앞)
  return [nx, ny, sx, sy, ex, ey, ax, ay, gap, neckSh, dist, tilt];
}

/** 화면에 보여 줄 값 */
export function readout(pts, H) {
  const f = features(pts, H);
  const dx = Math.abs(pts.ear.x - pts.shoulder.x), dy = pts.shoulder.y - pts.ear.y;
  return { angle: (Math.atan2(dy, dx) * 180) / Math.PI, gap: f[8] * 100, tilt: f[11] };
}

/** 골격 점에 지터를 더한 복사본 (데이터 늘리기) */
export function jitter(pts, H, sigma = 0.006, rnd = Math.random) {
  const g = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const out = {};
  for (const k of Object.keys(pts)) out[k] = { x: pts[k].x + g() * sigma * H, y: pts[k].y + g() * sigma * H };
  return out;
}

/* ===== 작은 신경망 (12 → 10 → 10 → 10 → 2) ===== */
const SIZES = [12, 10, 10, 10, 2];

function seeded(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export function initNet(seed = 7) {
  const rnd = seeded(seed), L = [];
  for (let l = 0; l < SIZES.length - 1; l++) {
    const nIn = SIZES[l], nOut = SIZES[l + 1], sc = Math.sqrt(1 / nIn);
    L.push({ W: Array.from({ length: nOut }, () => Array.from({ length: nIn }, () => (rnd() * 2 - 1) * sc * 1.7)), b: new Array(nOut).fill(0) });
  }
  return { L, mean: new Array(12).fill(0), std: new Array(12).fill(1) };
}

function forward(net, x) {
  const acts = [x];
  let a = x;
  net.L.forEach((layer, li) => {
    const z = layer.W.map((row, j) => row.reduce((s, w, i) => s + w * a[i], layer.b[j]));
    if (li < net.L.length - 1) a = z.map(Math.tanh);
    else { const m = Math.max(...z), e = z.map((v) => Math.exp(v - m)), s = e.reduce((p, q) => p + q, 0); a = e.map((v) => v / s); }
    acts.push(a);
  });
  return acts;
}

const norm = (net, f) => f.map((v, i) => (v - net.mean[i]) / net.std[i]);

/** 거북목일 확률 (0~1) */
export function predict(net, f) { return forward(net, norm(net, f)).at(-1)[1]; }

/**
 * 학습. data = [{ f: 12개 값, y: 0(바른) | 1(거북목) }]
 * 80%로 학습, 20%로 정확도 확인. Adam, 학습률 0.01 (논문 값)
 */
export function train(data, { epochs = 400, lr = 0.01, seed = 7 } = {}) {
  const rnd = seeded(seed + 1);
  const shuffled = [...data].sort(() => rnd() - 0.5);
  const nVal = Math.max(1, Math.round(shuffled.length * 0.2));
  const val = shuffled.slice(0, nVal), tr = shuffled.slice(nVal);
  const net = initNet(seed);
  for (let i = 0; i < 12; i++) {
    const vs = tr.map((d) => d.f[i]), m = vs.reduce((a, b) => a + b, 0) / vs.length;
    const sd = Math.sqrt(vs.reduce((a, b) => a + (b - m) ** 2, 0) / vs.length);
    net.mean[i] = m; net.std[i] = sd > 1e-9 ? sd : 1;
  }
  const X = tr.map((d) => norm(net, d.f)), Y = tr.map((d) => d.y);
  // Adam 상태
  const zeroLike = () => net.L.map((l) => ({ W: l.W.map((r) => r.map(() => 0)), b: l.b.map(() => 0) }));
  const m1 = zeroLike(), m2 = zeroLike(), b1 = 0.9, b2 = 0.999, eps = 1e-8;
  let t = 0;
  for (let ep = 0; ep < epochs; ep++) {
    const g = zeroLike();
    for (let n = 0; n < X.length; n++) {
      const acts = forward(net, X[n]);
      let delta = acts.at(-1).map((p, k) => p - (k === Y[n] ? 1 : 0)); // softmax + 교차 엔트로피
      for (let l = net.L.length - 1; l >= 0; l--) {
        const aIn = acts[l];
        delta.forEach((d, j) => { g[l].b[j] += d; aIn.forEach((a, i) => { g[l].W[j][i] += d * a; }); });
        if (l > 0) delta = aIn.map((a, i) => net.L[l].W.reduce((s, row, j) => s + row[i] * delta[j], 0) * (1 - a * a));
      }
    }
    t++;
    const upd = (P, G, M, V) => {
      const gi = G / X.length;
      const mi = b1 * M + (1 - b1) * gi, vi = b2 * V + (1 - b2) * gi * gi;
      return [P - (lr * (mi / (1 - b1 ** t))) / (Math.sqrt(vi / (1 - b2 ** t)) + eps), mi, vi];
    };
    net.L.forEach((layer, l) => {
      layer.W.forEach((row, j) => row.forEach((w, i) => { [row[i], m1[l].W[j][i], m2[l].W[j][i]] = upd(w, g[l].W[j][i], m1[l].W[j][i], m2[l].W[j][i]); }));
      layer.b.forEach((bb, j) => { [layer.b[j], m1[l].b[j], m2[l].b[j]] = upd(bb, g[l].b[j], m1[l].b[j], m2[l].b[j]); });
    });
  }
  const acc = (set) => set.filter((d) => (predict(net, d.f) >= 0.5 ? 1 : 0) === d.y).length / set.length;
  return { net, trainAcc: acc(tr), valAcc: acc(val), n: data.length };
}
