// 거북목 자세가 오래 이어지면 알림 (웹캠 모니터링·옆모습 판별 공통)
// - 5분 넘게 이어지면 화면 경고 + 소리 + (허용했으면) 컴퓨터 알림
// - 잠깐(5초 미만) 바르게 펴거나 화면에서 벗어나도 이어진 것으로 봄
// - 계속 거북목이면 5분마다 다시 알림
export const ALERT_MS = 5 * 60 * 1000;
export const REALERT_MS = 5 * 60 * 1000;
export const GRACE_MS = 5000;

const limit = () => (typeof window !== "undefined" && window.__neckAlertMs) || ALERT_MS; // 시험용으로 줄일 수 있음

function beep() {
  try {
    const a = beep.ctx || (beep.ctx = new (window.AudioContext || window.webkitAudioContext)());
    [0, 0.22].forEach((t) => { const o = a.createOscillator(), g = a.createGain(); o.frequency.value = 660; g.gain.value = 0.1; o.connect(g); g.connect(a.destination); o.start(a.currentTime + t); o.stop(a.currentTime + t + 0.15); });
  } catch {}
}

/** 켤 때(버튼 클릭 때) 한 번: 다른 창을 보고 있어도 알림이 뜨게 권한 요청 */
export function askNotify() {
  try { if ("Notification" in window && Notification.permission === "default") Notification.requestPermission(); } catch {}
}

/** 분 단위 표시 */
export const fmtMin = (ms) => `${Math.floor(ms / 60000)}분`;

export function neckTimer(alertEl, body) {
  let since = null, okSince = null, last = -Infinity;
  const fire = () => {
    beep();
    alertEl.hidden = false;
    try {
      if ("Notification" in window && Notification.permission === "granted")
        new Notification("거북목 자세가 5분 넘게 이어지고 있어요", { body, tag: "neck-alert", renotify: true });
    } catch {}
  };
  return {
    /** 매 장면 호출. bad = 지금 거북목인지 */
    update(bad, now) {
      if (bad) {
        okSince = null;
        since = since ?? now;
        if (now - since >= limit() && now - last >= Math.min(REALERT_MS, limit())) { last = now; fire(); }
      } else if (since !== null) {
        okSince = okSince ?? now;
        if (now - okSince >= GRACE_MS) { since = null; okSince = null; last = -Infinity; alertEl.hidden = true; }
      }
    },
    /** 거북목이 이어진 시간 (없으면 0) */
    elapsed(now) { return since === null ? 0 : now - since; },
    reset() { since = null; okSince = null; last = -Infinity; alertEl.hidden = true; },
  };
}
