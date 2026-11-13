// 자가운동 순서 — 물리치료 지도 내용에 맞게 이름·방법·시간을 바꿔 쓰는 자리
export type Step = { name: string; how: string; sec: number; art: string };

export const ROUTINE: Step[] = [
  { name: "턱 당기기", how: "정면을 보고 턱을 수평으로 뒤로 당겨 5초 버텨요. 천천히 반복해요.", sec: 40, art: "🙂" },
  { name: "목 옆 늘리기 · 왼쪽", how: "오른손을 엉덩이 아래에 두고, 머리를 왼쪽으로 기울여 목 옆을 늘려요.", sec: 20, art: "↖️" },
  { name: "목 옆 늘리기 · 오른쪽", how: "왼손을 엉덩이 아래에 두고, 머리를 오른쪽으로 기울여 목 옆을 늘려요.", sec: 20, art: "↗️" },
  { name: "가슴 펴기", how: "양팔을 뒤로 모아 깍지 끼고, 가슴을 앞으로 내밀며 어깨를 펴요.", sec: 30, art: "🙆" },
  { name: "날개뼈 모으기", how: "팔을 W 모양으로 들고, 날개뼈를 뒤로 모아 3초 버텼다가 풀어요.", sec: 30, art: "💪" },
];

export const ROUTINE_SEC = ROUTINE.reduce((s, x) => s + x.sec, 0);
export const INTERVALS = [30, 50, 60, 90];

export const TIPS = ["모니터 위쪽 끝을 눈높이에 맞춰요", "폰은 눈높이로 들어 올려서 봐요", "턱을 살짝 당기고 귀와 어깨를 일직선으로", "50분 앉았다면 일어나서 목을 풀어 줘요"];
