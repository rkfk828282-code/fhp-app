# 작업 규칙 (Claude가 매 대화마다 읽음)

- 대답은 무조건 한국어로.
- 새 화면·UI는 먼저 Artifact 시안(https://claude.ai/artifact/WqVipMpK19dKkjRCcYp4q4)에서 보여 주고, 확인받은 뒤 코드로 옮김.
- 카메라·웹캠처럼 Artifact에서 안 되는 기능은 서버 코드로 만들고, 머지 전에 스크린샷으로 보여 줌.
- 변경은 PR로 올리고, 사용자가 **`+`** (또는 "머지해줘")라고 하면 그때 머지함.
- 나중에 하기로 한 기능은 `docs/BACKLOG.md`에 있음. 사용자가 꺼내면 거기 적힌 대로 코드를 짬.

## 지금 방향
- 1차 프로토타입은 **노트북이 메인 디바이스**: 실시간 자세 측정은 노트북 웹캠만 씀. 휴대폰 카메라 연결은 숨김(`index.html`의 `data-phone="off"`, 보류 내용은 `docs/BACKLOG.md`)

## 구조 한눈에
- `app/`: 휴대폰 앱 (Expo, React Native)
- `server/`: Cloudflare Worker + 노트북 웹 (`server/public/index.html`). main에 머지되면 자동 배포
- 자세 판별: `server/public/posture.js` (정면 웹캠), `server/public/side-posture.js` + `side-model.js` (옆모습), 알림 공통 `neck-alert.js`
- 거북이 캐릭터: 사용자가 준 그림 → `server/public/img/turtle_*.png`, `app/assets/turtle/`
