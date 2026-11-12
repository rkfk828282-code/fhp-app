# fhp-app
전방머리자세(거북목) 자가 체크 앱 — CVA(두개척추각) 측정·기록, 휴대폰 ↔ 노트북 실시간 카메라 연동

> 자가 자세 체크·기록용이며 질환을 진단하지 않습니다.

## 폴더 구성
| 폴더 | 내용 | 기술 |
|---|---|---|
| `app/` | 휴대폰 앱 (노트북 송출, 폰에서 측정) | React Native (Expo) + TypeScript |
| `server/` | 실시간 연동 서버 + 노트북 화면 + 폰 브라우저 송출 화면 | Cloudflare Workers + Durable Objects |

## 처음 받을 때 (Windows)
```bash
cd C:\dev
git clone https://github.com/rkfk828282-code/fhp-app.git
```

## 최신 코드 받기
```bash
cd C:\dev\fhp-app
git pull
```

## 서버 (`server/`)
```bash
cd C:\dev\fhp-app\server
npm install
npx wrangler login     # 처음 한 번
npm run deploy         # 인터넷에 올리기 → https://neckcheck-live.<이름>.workers.dev
```
- 노트북: 위 주소를 열면 연결 코드와 QR이 나옵니다.
- 폰 브라우저 시험: `주소/phone.html` 에서 코드 입력

## 앱 (`app/`)
```bash
cd C:\dev\fhp-app\app
npm install
```
1. `src/config.ts`의 `SERVER_URL`을 서버 주소로 바꿉니다.
2. 안드로이드 시험 앱 빌드 (새 기본 기능 부품을 추가했을 때만 다시):
   ```bash
   npx eas-cli build --profile development --platform android
   ```
3. 실행: `npm start` → 폰에 설치한 시험 앱에서 열기

## 측정 원리
C7 극돌기와 귀 이주를 이은 선이 수평선과 이루는 각도(CVA). 기본 기준값 50° 미만이면 "전방머리자세 경향"으로 표시합니다. 계산 함수: `app/src/utils/cva.ts`
