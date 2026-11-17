# 나중에 할 기능

사용자가 "TURN 넣자", "기능 스위치 만들자"처럼 꺼내면 아래 내용대로 코드를 짠다.

## 1. 다른 네트워크에서도 연결 (TURN 중계 서버)

- **왜**: 지금은 STUN(`stun:stun.cloudflare.com:3478`)만 써서, 휴대폰이 LTE·5G이거나 학교·회사 와이파이면 영상이 "연결 중"에서 멈출 수 있음. 그래서 안내에 "같은 와이파이에서"라고 적어 둠.
- **방법**: Cloudflare TURN 서비스를 씀.
  - 사용자가 Cloudflare 대시보드에서 TURN 키(Key ID + API 토큰)를 만들고, Worker 설정의 비밀값으로 넣음.
  - Worker에 `/turn` 같은 주소를 만들어, 짧게 쓰는 TURN 접속 정보를 발급해서 돌려줌. 키는 브라우저에 드러나지 않게 함.
  - 노트북(`server/public/index.html`), 휴대폰 웹(`server/public/phone.html`), 앱(`app/src/screens/LiveSendScreen.tsx`)에서 연결 전에 `/turn`을 불러 `iceServers`에 더함. 실패하면 지금처럼 STUN만 씀.
  - 연결되면 안내 문구의 "같은 와이파이에서"를 빼거나 바꿈.
- **빼기**: Worker 설정에서 키를 지우면 자동으로 STUN만 씀. 완전히 빼려면 해당 PR을 되돌림.
- **비용**: 무료 사용량 안에서 시연은 충분할 것으로 예상. 정확한 한도는 Cloudflare 요금 안내에서 확인.
- 영상은 중계 서버를 지나갈 뿐 저장하지 않음.

## 2. 기능 스위치 (한 곳에서 켜고 끄기)

- **왜**: 기능을 만들어 두고 필요할 때만 켜기 위해. 지금은 숨기는 방법이 기능마다 다름.
- **방법**:
  - 노트북 웹: `server/public/features.js` 하나에 모음. 예: `{ frontShot: false, sideShot: false, sidePosture: true, webcamMonitor: true, turn: false }`
  - 휴대폰 앱: `app/src/features.ts` 하나에 모음.
  - 지금 따로 숨겨 둔 것을 옮겨 옴: `index.html`의 `data-front-shot="off"`(웹캠 사진 찍기), `data-side-shot="off"`(휴대폰 사진 찍기·찍은 사진·측정 완료).
  - 원하면 MY 화면에 개발자용 스위치 화면을 둠.
- **스토어 출시 전에**: 꺼 둔 기능의 코드와 권한(카메라 등)이 심사에 걸리지 않게 정리함. 쓰지 않는 권한과 설명에 없는 숨은 기능은 빼는 게 안전함.
