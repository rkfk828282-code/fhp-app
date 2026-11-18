# 나중에 할 기능

사용자가 "TURN 넣자", "기능 스위치 만들자"처럼 꺼내면 아래 내용대로 코드를 짠다.

## 1. 다른 네트워크에서도 연결 (TURN 중계 서버) — 완료
- 코드: 서버 `/turn` (server/src/index.ts), 노트북·휴대폰 웹·앱이 연결 전에 받아서 씀
- 켜는 법: Cloudflare 대시보드에서 TURN 키를 만들고 Worker 비밀값 `TURN_KEY_ID`, `TURN_KEY_API_TOKEN`으로 넣기
- 끄는 법: 두 비밀값을 지우면 자동으로 STUN만 씀

## 2. 기능 스위치 (한 곳에서 켜고 끄기)

- **왜**: 기능을 만들어 두고 필요할 때만 켜기 위해. 지금은 숨기는 방법이 기능마다 다름.
- **방법**:
  - 노트북 웹: `server/public/features.js` 하나에 모음. 예: `{ frontShot: false, sideShot: false, sidePosture: true, webcamMonitor: true, turn: false }`
  - 휴대폰 앱: `app/src/features.ts` 하나에 모음.
  - 지금 따로 숨겨 둔 것을 옮겨 옴: `index.html`의 `data-front-shot="off"`(웹캠 사진 찍기), `data-side-shot="off"`(휴대폰 사진 찍기·찍은 사진·측정 완료).
  - 원하면 MY 화면에 개발자용 스위치 화면을 둠.
- **스토어 출시 전에**: 꺼 둔 기능의 코드와 권한(카메라 등)이 심사에 걸리지 않게 정리함. 쓰지 않는 권한과 설명에 없는 숨은 기능은 빼는 게 안전함.
