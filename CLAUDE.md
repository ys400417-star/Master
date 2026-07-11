# 배달마스터 (Delivery Master)

배달 라이더(배민커넥트)용 수익 관리 PWA. 사용자는 갤럭시 폰 브라우저/홈화면 설치 앱으로 사용한다.
소유자는 개발 지식이 없으므로 **한국어로, 비전문가에게 설명하듯** 소통할 것.

## 배포

- `main`에 푸시하면 GitHub Pages로 자동 배포됨: https://ys400417-star.github.io/Master/
- 별도 빌드 없음. 정적 파일 3개가 전부: `index.html`(앱 전체), `sw.js`(서비스워커), `manifest.json`

## 수정할 때 반드시 지킬 것

1. **버전 올리기**: 수정 시마다 `index.html`의 두 곳을 같은 번호로 올린다
   - `<title>Delivery Master V59.0</title>`
   - 헤더의 `V59.0</span>`
2. **서비스워커 캐시 이름도 같이 올리기**: `sw.js`의 `const CACHE = 'delivery-master-v59-0'`
   — 이걸 안 올리면 사용자 폰에 업데이트가 안 감
3. **localStorage 데이터 호환 유지**: 키는 `masterV58` (버전과 무관하게 고정).
   데이터 구조(`d` 객체)에 필드를 추가할 땐 `DEFAULT_DATA`에 기본값을 넣고,
   `window.onload`의 가드(`if(!d.xxx)d.xxx=...`)도 추가해서 기존 사용자 데이터가 깨지지 않게 한다.
   **기존 필드의 의미를 바꾸거나 삭제하지 말 것** — 사용자의 몇 달치 수익 기록이 들어있다.
4. 커밋 메시지는 영어, 버전 번호로 시작 (예: `V59.1: ...`)

## 아키텍처 (index.html 단일 파일)

- Tailwind CDN + Font Awesome + Leaflet(지도). 모든 JS가 `<script>` 한 블록에 있음
- 데이터는 전부 localStorage (`store` 래퍼 사용 — 직접 localStorage 호출 금지, data: URL 환경 대응)
- `d` = 전역 상태. `save()` 후 `render()`가 전체 UI 갱신
- 주요 데이터: `d.logs`(오늘 배달 건들), `d.arch`(과거 일별 아카이브, `logs` 포함),
  `d.slots`/`slotTs`/`slotLoc`(배차 슬롯 6개), `d.path`/`d.draw`(GPS 경로 원본/도로보정),
  `d.missions`, `d.expenses`, `d.goals`, `d.fuel`, `d.runSec`(운행 누적 초)
- 배달 로그 필드: `amt`(금액), `ts`(완료시각), `dispatchTs`(배차시각), `s`(슬롯번호, 999=보정, '🎁'=미션보너스),
  `w`(날씨), `lat/lng`(배송지), `dLat/dLng`(배차 받은 대기장소)
- 슬롯 흐름: 대기(0) → 탭 → 배달중(2) → 탭 → 금액입력 모달. 길게 누르면 초기화
- 완료 모달은 열린 뒤 400ms간 저장/취소 무시 (오터치 방지, `modalGuardTs`)
- 미션 진행: `max(startTs, createdTs)` 이후 배차만 카운트
- 경로: GPS 점 간격이 300m 넘으면 OSRM(router.project-osrm.org)으로 도로 경로 보간
- 지도 레이어: 🔥 수익 히트맵(배송지 기준), 🪑 대기자리(배차 위치 기준), 꿀콜/기피지 마커

## 하지 말 것

- 웹앱은 백그라운드 GPS 불가 — 네이티브 앱 전환 제안은 사용자가 이미 보류함
- AI(Claude API) 연동은 사용자가 보류 중 — 먼저 제안하지 말 것
- 외부 프레임워크/빌드 도구 도입 금지 (단일 파일 유지)
- API 키를 코드에 넣지 말 것 (공개 저장소)

## 검증

- 푸시 전에 브라우저에서 실제로 열어 동작 확인 (콘솔 에러 포함)
- 사용자 데이터가 있는 상태를 가정하고 마이그레이션 경로 테스트
