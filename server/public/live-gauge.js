// 실시간 자세 게이지 + 거북이 (웹캠 모니터링·옆모습 판별 공통)
// score: 0(거북목) ~ 1(바른 자세). 바늘이 부드럽게 따라 움직이고, 구간에 맞춰 거북이 표정이 바뀜
//   0 ~ 0.4 거북목(빨강) · 0.4 ~ 0.7 주의(노랑) · 0.7 ~ 1 바른 자세(초록)
const STAGE = [
  { max: 0.4, mood: "bad", t: "거북목", c: "#FF8A7A" },
  { max: 0.7, mood: "strain", t: "주의", c: "#F2C230" },
  { max: 1.01, mood: "good", t: "바른 자세", c: "#4BE3B0" },
];
export const stageOf = (score) => STAGE.find((s) => score < s.max) || STAGE[2];

export function createLiveGauge(el, { title = "지금 자세" } = {}) {
  const cx = 110, cy = 100, R = 80, sw = 14;
  const pt = (f, r = R) => { const a = Math.PI * (1 - f); return [cx + r * Math.cos(a), cy - r * Math.sin(a)]; };
  const arc = (a, b, c) => { const [x1, y1] = pt(a), [x2, y2] = pt(b); return `<path d="M${x1} ${y1} A${R} ${R} 0 0 1 ${x2} ${y2}" stroke="${c}" stroke-width="${sw}" fill="none"/>`; };
  el.classList.add("live-gauge");
  el.innerHTML = `
    <img class="lg-turtle" alt="" src="/img/turtle_good.png">
    <div class="lg-dial">
      <svg viewBox="0 0 220 112" role="img" aria-label="${title}">
        ${arc(0, 0.395, STAGE[0].c)}${arc(0.405, 0.695, STAGE[1].c)}${arc(0.705, 1, STAGE[2].c)}
        <g class="lg-needle" style="transform-origin:${cx}px ${cy}px"><line x1="${cx}" y1="${cy}" x2="${cx - R + 22}" y2="${cy}" stroke="#EAF2FF" stroke-width="4" stroke-linecap="round"/></g>
        <circle cx="${cx}" cy="${cy}" r="7" fill="#EAF2FF"/><circle cx="${cx}" cy="${cy}" r="3" fill="#12284A"/>
      </svg>
      <div class="lg-label"><b class="lg-stage">–</b><span class="lg-sub"></span></div>
    </div>`;
  const needle = el.querySelector(".lg-needle"), img = el.querySelector(".lg-turtle"), stage = el.querySelector(".lg-stage"), sub = el.querySelector(".lg-sub");
  // 바늘은 화면 새로 그릴 때마다(1초 60번) 목표 쪽으로 조금씩 → 판별이 1초 10번이어도 부드럽게
  let target = null, shown = null, mood = "good", raf = 0, lastStage = "", lastSub = "";
  const frame = () => {
    raf = 0;
    if (target === null) return;
    shown = shown === null ? target : shown + (target - shown) * 0.25;
    needle.style.transform = `rotate(${(shown * 180).toFixed(2)}deg)`;
    const st = stageOf(shown);
    if (st.t !== lastStage) { lastStage = st.t; stage.textContent = st.t; stage.style.color = st.c; }
    if (st.mood !== mood) { mood = st.mood; img.src = `/img/turtle_${mood}.png`; img.alt = `${st.t} 거북이`; }
    if (Math.abs(target - shown) > 0.002) raf = requestAnimationFrame(frame);
  };
  const setSub = (t) => { if (t !== lastSub) { lastSub = t; sub.textContent = t; } };
  return {
    /** score 0~1, 없으면 null(인식 안 됨). note = 아래 작은 글 */
    set(score, note = "") {
      setSub(note);
      if (score === null || score === undefined || !Number.isFinite(score)) {
        target = null; el.dataset.off = "1"; lastStage = "–"; stage.textContent = "–"; stage.style.color = ""; return;
      }
      delete el.dataset.off;
      target = Math.max(0, Math.min(1, score));
      if (!raf) raf = requestAnimationFrame(frame);
    },
    reset() { shown = null; this.set(null); },
  };
}
