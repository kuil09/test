# Orbit Mindmap

WebMCP를 지원하는 로컬 우선 마인드맵 웹앱입니다.

## 기능

- 노드 추가, 편집, 삭제, 재부모화
- 캔버스 패닝, 줌, 노드 드래그, 자동 정렬
- 브라우저 `localStorage` 자동 저장
- JSON 가져오기/내보내기
- GitHub Pages 자동 배포
- Chrome WebMCP 명령형 API 지원

## WebMCP

지원되는 브라우저에서는 `document.modelContext.registerTool()`로 다음 도구를 노출합니다.

- `get_map` — 현재 맵을 outline과 node ID로 읽기
- `create_map` — 들여쓰기된 outline으로 맵 전체 만들기
- `add_node` — 자식 노드 추가
- `update_node` — 노드 텍스트 변경
- `reparent_node` — 브랜치의 부모 변경
- `delete_node` — 브랜치 삭제
- `focus_node` — 화면에서 특정 노드 선택/표시

현재 WebMCP는 실험 단계입니다. 로컬 검증 시 Chrome 149 이상에서 `chrome://flags/#enable-webmcp-testing`을 활성화한 뒤 페이지를 여세요. 배포 환경에서 API를 일반 사용자에게 제공하려면 Chrome의 WebMCP 오리진 트라이얼 조건을 따릅니다.

## 개발

Node.js 22 이상이 필요합니다. 외부 런타임 의존성은 없습니다.

```bash
npm test
npm run build
npm run check
```

production 파일은 `dist/`에 생성되며 커밋하지 않습니다.

## 배포

`main`에 push하면 `.github/workflows/deploy-pages.yml`이 테스트, 빌드, GitHub Pages 배포를 수행합니다.

배포 URL: `https://kuil09.github.io/test/`
