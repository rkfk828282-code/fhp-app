# Pretendard (가변 글꼴)
- 출처: https://github.com/orioncactus/pretendard (v1.3.9)
- 라이선스: SIL Open Font License 1.1 — 상업적 사용, 웹·앱 포함 배포 가능 (글꼴 단독 판매 금지)

## PretendardSubset.woff2
- 원본(약 2MB)에서 한글 2,350자(KS X 1001)와 영문·숫자·기호, 이 앱 화면에 쓰는 글자만 남긴 파일(약 450KB)
- 만든 방법: `pyftsubset PretendardVariable.woff2 --text-file=글자목록.txt --flavor=woff2 --layout-features='*'`
- 목록에 없는 글자는 기기 기본 글꼴로 보임
