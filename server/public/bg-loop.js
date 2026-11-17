// 다른 창을 보거나 브라우저를 내려 둬도 자세 판별이 계속 돌게 하는 도우미
// - 화면 그리기 타이머(requestAnimationFrame)는 탭이 안 보이면 멈춤 → Worker 타이머로 반복
//   (Worker 타이머는 백그라운드에서도 거의 늦춰지지 않음)
// - 안 보일 때는 영상 화면 대신 카메라 트랙에서 직접 한 장씩 가져옴 (ImageCapture)
// - 안 보일 때는 느리게(기본 0.5초마다) 돌려서 노트북 부담을 줄임
// 브라우저를 완전히 닫으면 멈춤.

/** fn을 반복 호출. 보일 때 fgMs, 안 보일 때 bgMs 간격. 멈추는 함수를 돌려줌 */
export function bgLoop(fn, fgMs = 50, bgMs = 500) {
  const code = "let t;onmessage=(e)=>{clearInterval(t);if(e.data>0)t=setInterval(()=>postMessage(0),e.data)}";
  const url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
  const w = new Worker(url);
  URL.revokeObjectURL(url);
  w.onmessage = () => fn();
  const set = () => w.postMessage(document.hidden ? bgMs : fgMs);
  document.addEventListener("visibilitychange", set);
  set();
  return () => { document.removeEventListener("visibilitychange", set); w.terminate(); };
}

const captures = new WeakMap();

/**
 * 판별에 쓸 한 장. 보일 때는 영상 요소 그대로, 안 보일 때는 카메라 트랙에서 가져온 그림.
 * 돌려준 close()는 다 쓰고 꼭 호출 (그림 메모리 정리).
 */
export async function grabFrame(video) {
  if (!video) return null;
  if (!document.hidden && video.readyState >= 2 && video.videoWidth)
    return { img: video, W: video.videoWidth, H: video.videoHeight, close() {} };
  const track = video.srcObject && video.srcObject.getVideoTracks ? video.srcObject.getVideoTracks()[0] : null;
  if (!track || track.readyState !== "live") return null;
  if (typeof ImageCapture === "undefined") {
    // ImageCapture가 없는 브라우저: 영상 요소가 계속 갱신되면 그대로 사용
    return video.readyState >= 2 && video.videoWidth ? { img: video, W: video.videoWidth, H: video.videoHeight, close() {} } : null;
  }
  try {
    let cap = captures.get(track);
    if (!cap) { cap = new ImageCapture(track); captures.set(track, cap); }
    const bmp = await cap.grabFrame();
    return { img: bmp, W: bmp.width, H: bmp.height, close: () => bmp.close() };
  } catch {
    return null;
  }
}

/** 탭 제목에 상태 표시 (다른 탭을 보고 있어도 알 수 있게) */
const baseTitle = document.title;
const titles = new Map();
export function setTabStatus(key, text) {
  if (text) titles.set(key, text); else titles.delete(key);
  const t = [...titles.values()][0];
  document.title = t ? `${t} · ${baseTitle}` : baseTitle;
}
