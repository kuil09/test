# 간단한 Todo 웹앱

HTML, CSS, JavaScript 모듈만 사용하는 의존성 없는 Todo 애플리케이션입니다.

## 기능

- 할 일 추가, 완료 처리, 삭제
- 전체 / 진행 중 / 완료 필터
- 완료 항목 일괄 삭제
- 브라우저 `localStorage` 자동 저장
- 반응형 및 키보드 접근성 지원

## 개발

Node.js 22 이상이 필요합니다.

```bash
npm test
npm run build
```

프로덕션 빌드는 `dist/`에 생성됩니다. 해당 디렉터리를 정적 웹 서버로 제공하면 됩니다.

Chat 기반 리포지토리 개발을 위한 Luna Chat Coder skill은 `.agents/` 아래에 그대로 유지합니다.
