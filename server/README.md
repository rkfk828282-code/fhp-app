# 거북목 체크 - 실시간 카메라 연동 서버

휴대폰 카메라 화면을 노트북 화면에 실시간으로 띄웁니다.

- `src/index.ts` : 폰과 노트북을 연결 코드로 묶어 주는 서버 (Cloudflare Workers + Durable Objects)
- `public/index.html` : 노트북 화면 (실시간 보기, 찍기, 점 찍어 CVA 계산)
- `public/phone.html` : 휴대폰 송출 화면 (브라우저용 시험판 — 나중에 Expo 앱이 같은 역할)

## 명령어
- `npm install` : 처음 한 번
- `npx wrangler login` : 처음 한 번 (Cloudflare 로그인)
- `npm run deploy` : 인터넷에 올리기
- `npm run dev` : 내 노트북에서만 시험
