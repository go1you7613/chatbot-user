# 팅크웨어 AI Chat — 개발팀 퍼블리싱 소스 인수인계 가이드

> 작성일: 2026-06-28  
> 대상: 퍼블리싱 소스 인수 개발팀  
> 함께 전달되는 문서: `팅크웨어_핸드오프_점검_보고서_v2.md`, `프로토타입_전달범위_검토.md`

---

## 1. 소스 개요

### 1-1. 전달 파일 목록

```
publishing/
├── html/
│   ├── chatbot.html          ← 메인 서비스 화면 (모든 플로우 포함)
│   ├── login-required.html   ← 로그인 필요 상태 화면
│   ├── empty-reservations.html ← 예약 내역 없음 상태 화면
│   └── network-error.html    ← 네트워크 오류 상태 화면
├── css/
│   ├── tokens.css            ← 디자인 토큰 (색상, 타이포, 간격, 반경)
│   ├── components.css        ← 공통 컴포넌트 스타일
│   └── chatbot.css           ← 서비스 전용 스타일 + Flatpickr 오버라이드
├── js/
│   ├── chatbot.js            ← 메인 UI 이벤트 · 플로우 로직
│   └── state.js              ← 서브 HTML 네비게이션 (뒤로가기 등)
├── image/
│   ├── icon/                 ← SVG · PNG 아이콘
│   └── product/              ← 제품 이미지
└── fonts/
    └── (웹폰트 파일)
```

### 1-2. 외부 의존성

| 라이브러리 | 로드 방식 | 비고 |
|-----------|----------|------|
| Flatpickr | CDN (현재 @latest) | **반드시 버전 고정** → `flatpickr@4.6.13` 권고 |

```html
<!-- 권고 버전 고정 방식 -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr@4.6.13/dist/flatpickr.min.css">
<script src="https://cdn.jsdelivr.net/npm/flatpickr@4.6.13"></script>
```

> Flatpickr 버전을 변경하면 `chatbot.js`의 `syncCalendarMonthDropdown()` 함수와  
> `chatbot.css`의 `.flatpickr-*` 오버라이드 셀렉터가 정상 동작하지 않을 수 있습니다.

### 1-3. CSS 캐시버스팅 버전

모든 HTML 파일의 CSS · JS 참조는 `?v=20260628`으로 통일되어 있습니다.  
파일 수정 후 배포 시 버전 문자열을 갱신해 브라우저 캐시를 무력화하세요.

```html
<link rel="stylesheet" href="../css/tokens.css?v=20260628">
<link rel="stylesheet" href="../css/components.css?v=20260628">
<link rel="stylesheet" href="../css/chatbot.css?v=20260628">
<script src="../js/chatbot.js?v=20260628"></script>
```

---

## 2. 파일 구조 및 역할

### 2-1. HTML — 화면별 기능 ID

| 파일 | 기능 ID | 설명 |
|------|--------|------|
| chatbot.html | USER-SCR-01 ~ 12 | 홈, 대화, AS예약, 장착점 찾기, FAQ, 제품 검색, 설문 등 전체 포함 |
| login-required.html | USER-SCR-03 | 로그인 필요 상태 독립 화면 |
| empty-reservations.html | USER-SCR-06 | 예약 내역 없음 독립 화면 |
| network-error.html | USER-SCR-13 | 네트워크 오류 독립 화면 |

> `chatbot.html` 한 파일 안에 `.flow` 섹션으로 12개 화면이 모두 포함됩니다.  
> `aria-hidden` 속성으로 비활성 플로우를 숨기고, JS에서 상태를 제어합니다.

### 2-2. CSS — 3계층 구조

```
tokens.css         ← 1계층: 디자인 원자값 (변수 정의만, 규칙 없음)
    ↓
components.css     ← 2계층: 버튼·입력·카드 등 재사용 컴포넌트
    ↓
chatbot.css        ← 3계층: 서비스 레이아웃·화면별 스타일·Flatpickr 오버라이드
```

- 모든 색상·간격·폰트는 `tokens.css`의 `--twc-*` CSS 변수를 사용합니다.
- `chatbot.css`에서 하드코딩된 색상 값을 발견하면 `tokens.css`의 변수로 대체하는 것을 권고합니다.
- **토큰 신규 등록 필요 항목** (현재 fallback 값으로 동작 중):
  - `--twc-color-saturday` (`#4a90d9`): 토요일 날짜 색상
  - `--twc-color-focus` (`#1677ff`): 월 선택 포커스 색상

### 2-3. JS — 2종 역할 분리

| 파일 | 역할 | 사용 화면 |
|------|------|----------|
| `chatbot.js` | 메인 UI 이벤트 · 플로우 제어 · 캘린더 · 채팅 | chatbot.html |
| `state.js` | 서브 HTML에서 뒤로가기 등 간단한 네비게이션 | login-required, empty-reservations, network-error |

---

## 3. JS 아키텍처 가이드

### 3-1. IIFE 캡슐화 패턴

`chatbot.js` 전체가 IIFE로 감싸져 있습니다. 전역 오염 없이 내부 변수를 격리합니다.

```javascript
(() => {
  // 모든 변수·함수가 이 스코프 안에서 선언됨
  const app = document.querySelector('[data-js="chatbot"]');
  // ...
})();
```

### 3-2. `data-action` 이벤트 위임 구조

클릭 이벤트는 최상위 `app` 요소에서 단일 리스너로 위임받습니다.  
HTML 요소에 `data-action="액션명"` 속성을 추가하면 JS에서 자동으로 처리됩니다.

```javascript
app.addEventListener('click', (event) => {
  const actionTarget = event.target.closest('[data-action]');
  if (!actionTarget) return;
  const action = actionTarget.dataset.action;
  if (action === 'open-flow') openFlow(...);
  // ...
});
```

**전체 action 목록 (16종)**

| data-action | 처리 함수 | 설명 |
|-------------|----------|------|
| `open-sheet` | `setSheetOpen(true)` | 카테고리 바텀시트 열기 |
| `close-sheet` | `setSheetOpen(false)` | 카테고리 바텀시트 닫기 |
| `open-flow` | `openFlow(target)` | 지정 플로우 열기 (`data-flow-target` 사용) |
| `close-flow` | `closeFlow()` | 현재 플로우 닫기 |
| `navigate` | `navigateTo(href)` | 다른 HTML 페이지 이동 |
| `as-back` | `goToPreviousAsStep()` | AS 예약 이전 단계로 |
| `as-next` (footer btn) | `goToNextAsStep()` | AS 예약 다음 단계로 |
| `send-message` | `sendMessage(input.value)` | 채팅 메시지 전송 |
| `send-suggestion` | `sendMessage(data-message)` | 추천 질문 클릭 전송 |
| `select-in-group` | `selectInGroup()` | 그룹 내 단일 선택 토글 |
| `select-spec-product` | `renderSpecProduct()` | 스펙 탭 제품 전환 |
| `toggle-as-region` | `toggleAsRegionSelect()` | 지역 드롭다운 토글 |
| `select-as-region` | `selectAsRegion()` | 지역 선택 적용 |
| `select-slot` | `selectInGroup()` + 요약 업데이트 | 시간 슬롯 선택 |
| `switch-tab` | 탭 전환 + 패널 표시 | `data-tab-group`, `data-tab-target` 사용 |
| `faq-detail` / `faq-list` | FAQ 상세·목록 전환 | |
| `button-feedback` | `showButtonFeedback()` | **[프로토타입 임시]** 1.2초 선택 피드백 — 반드시 실제 액션으로 교체 필요 |

### 3-3. AS 예약 다단계 플로우 흐름

```
[1단계] 약관 동의
  ↓ (다음)
[2단계] 센터 선택 (지도 API + 센터 카드)
  ↓ (다음)
[3단계] 날짜·시간 선택 (Flatpickr 캘린더 + 슬롯 그리드)
  ↓ (날짜 클릭 시 renderTimeSlots() 실행)
[4단계] 예약자 정보 입력 (폼)
  ↓ (다음 = 제출)
[5단계] 예약 완료 (결과 화면)
```

- 단계 진행: `data-as-step` 속성으로 단계 구분, `goToAsStep(n)` 함수로 전환
- `data-js="asProgress"` 요소: `data-progress="n"` 값으로 CSS 프로그레스 바 제어

### 3-4. Flatpickr 통합 방식

캘린더는 `[data-js="asCalendar"]` div에 Flatpickr inline 모드로 마운트됩니다.

```javascript
calendarInstance = flatpickr(asCalendarEl, {
  inline: true,
  locale: KO_LOCALE,     // 한국어 로케일 (인라인 정의)
  minDate: 'today',
  disable: [(date) => date.getDay() === 0 || date.getDay() === 6],  // 주말 비활성
  onDayCreate: (dates, str, fp, dayElem) => {
    // 일/토 요일 클래스 주입 (CSS 색상 처리용)
    if (dayElem.dateObj?.getDay() === 0) dayElem.classList.add('is-sunday');
    if (dayElem.dateObj?.getDay() === 6) dayElem.classList.add('is-saturday');
  },
  onChange: (dates) => {
    renderTimeSlots(dates[0]);    // 시간 슬롯 갱신
    updateAsSummaryDate(dates[0]); // 요약 날짜 갱신
  }
});
```

---

## 4. 주의깊게 봐야할 부분

### 4-1. `syncCalendarMonthDropdown()` — Flatpickr 내부 DOM 직접 조작

```
⚠️ Flatpickr 버전 업그레이드 시 재검증 필수
```

`syncCalendarMonthDropdown(fp)` 함수는 Flatpickr가 렌더링한 `.flatpickr-current-month` 내부에 커스텀 월 선택 드롭다운을 직접 주입합니다.

- 의존하는 Flatpickr 내부 클래스: `.flatpickr-current-month`, `select.cur-month`, `select.flatpickr-monthDropdown-months`
- Flatpickr 버전이 변경되면 이 클래스명이 바뀌거나 DOM 구조가 달라질 수 있음
- 현재 검증 버전: `flatpickr@4.6.x`

### 4-2. `button-feedback` — 프로토타입 임시 핸들러

`data-action="button-feedback"` 버튼은 현재 클릭 시 1.2초간 시각 피드백만 주는 임시 처리입니다.  
퍼블리싱에서 45개 사용되며, 유형별로 실제 기능으로 교체해야 합니다.

| 유형 | 위치 (예시) | 교체 방향 |
|------|-----------|----------|
| A. 구매전문가 연결 | 제품 상세 CTA | 상담 채널 API 연결 (전화/채팅/예약) |
| B. 검색 미결 대안 CTA | empty-search 영역 | 챗봇 입력 또는 플로우 진입 |
| C. 목록 정렬 | 장착점·센터 목록 | 정렬 옵션 드롭다운 구현 |
| D. 전화 · 길찾기 | 장착점·센터 카드 | `tel:{phone}` / 카카오·네이버맵 딥링크 |
| E. 예약 상세/변경/취소 | 예약 조회 화면 | `GET /api/reservation/{id}`, `DELETE /api/reservation/{id}` |
| F. 소셜 로그인 | 로그인 플로우 | 각 플랫폼 OAuth 2.0 흐름 연동 |

### 4-3. `navigate` vs `state.js` — 이중 네비게이션 처리

현재 두 가지 네비게이션 방식이 공존합니다.

| 방식 | 위치 | 동작 |
|------|------|------|
| `data-action="navigate"` (chatbot.js) | chatbot.html 내부 | `window.location.href = dataset.href` |
| `data-state-action="back"` (state.js) | 서브 HTML들 | `window.history.back()` |

> SPA 프레임워크 도입 시 두 방식을 통합하거나 라우터로 일원화하는 것을 권고합니다.

### 4-4. `chatbot.css` — Flatpickr `!important` 오버라이드 섹션

`chatbot.css` 하단의 Flatpickr 오버라이드 섹션(`/* Flatpickr 디자인 토큰 오버라이드 (v2) */` 이후)은  
Flatpickr 기본 CSS가 `!important`를 광범위하게 사용하기 때문에 불가피하게 `!important`를 대응 적용합니다.

- 이 섹션은 `.twc-calendar` 스코프로 한정 — 다른 Flatpickr 인스턴스에 영향 없음
- 임의로 `!important`를 제거하면 Flatpickr 기본 스타일에 눌려 레이아웃이 깨질 수 있음

### 4-5. 탭 컴포넌트 — `data-tab-group` / `data-tab-panel` 속성 기반 제어

장착점·센터 찾기 탭은 HTML 속성으로 제어됩니다.

```html
<!-- 탭 버튼 -->
<button role="tab" aria-controls="locator-panel-shop"
        data-action="switch-tab" data-tab-group="locator" data-tab-target="shop">

<!-- 탭 패널 -->
<div id="locator-panel-shop" role="tabpanel"
     data-tab-panel="locator" data-tab-name="shop">
```

`switch-tab` 액션 처리 시 `data-tab-group` 값이 동일한 탭 버튼과 패널을 찾아 `is-active` 클래스를 전환합니다.

---

## 5. 반드시 수정/교체해야 할 항목

### 🔴 API 연동 교체 (착수 전 필수)

#### 5-1. 로그인 form — action/method 추가

```html
<!-- 현재 (퍼블리싱) -->
<form class="twc-content form-stack" data-js="loginForm">

<!-- 개발 시 추가 필요 -->
<!-- action, method는 JS submit 이벤트로 처리하므로 아래는 폴백용 -->
<form class="twc-content form-stack" data-js="loginForm"
      action="/api/auth/login" method="post">
```

> JS에서 `loginForm`의 `submit` 이벤트를 가로채 `fetch`로 처리합니다.  
> 성공 시 `data-owned-product-state` 속성을 변경해 보유제품 섹션을 전환합니다.

#### 5-2. 설문 form — action/method + 선택값 수집

```html
<!-- 현재 (퍼블리싱) -->
<form class="twc-content survey-form">

<!-- 개발 시 추가 필요 -->
<form class="twc-content survey-form" action="/api/survey" method="post">
```

> `data-action="select-in-group"` 버튼의 선택값은 form data에 자동 포함되지 않습니다.  
> JS에서 `<input type="hidden" name="resolved" value="예">` 형태로 수집 후 제출해야 합니다.

#### 5-3. AS 슬롯 데이터 — API 교체

`chatbot.js` L46의 `SLOT_AVAIL` 상수를 API 응답으로 교체합니다.

```javascript
// [프로토타입] 현재 더미 데이터
const SLOT_AVAIL = {
  1: ['09:30', '10:00', ...],
  // ...
};

// [개발 연동] 아래 API로 교체
// GET /api/as/slots?centerId={id}&date={YYYY-MM-DD}
// 응답 예: { available: ["09:30", "10:00", "13:30"] }
// renderTimeSlots() 함수 내부의 avail 변수 바인딩만 수정하면 됨
```

#### 5-4. AI 응답 — API 연동

`chatbot.js`의 `sendMessage()` 함수에서 하드코딩된 더미 응답을 AI API 연결로 교체합니다.

```javascript
// [프로토타입] 현재 더미 응답
addAiMessage('문의 내용을 확인했습니다. 관련 제품 안내와 고객지원 메뉴를 함께 확인해보세요.');

// [개발 연동] AI API 응답 스트리밍 또는 단일 응답으로 교체
// addAiMessage() 함수의 DOM 마크업 구조는 그대로 유지 가능
```

---

### 🟡 HTML 더미 데이터 제거

| 위치 | 더미 내용 | 처리 방법 |
|------|-----------|-----------|
| chatbot.html `[data-as-step="4"]` | `value="김하나"`, `value="010-0000-1234"`, `value="QXD5000"` | 빈 값 또는 로그인 사용자 정보로 동적 바인딩 |
| chatbot.html `[data-as-step="5"]` | `INV-2026-06291`, 예약 완료 상세 | 서버 응답값으로 동적 교체 |
| reservation-flow | `value="TW-AI-0001"`, `value="연락처 확인용"` | 빈 값으로 교체 (사용자 입력) |
| reservation-flow 카드 | `2026년 6월 22일 (월) 09:30` | 서버 응답값으로 동적 교체 |
| chatbot.html L265 | `<time datetime="2026-06-28T17:11">` | 실제 발화 시점으로 JS 처리 (addUserMessage/addAiMessage 패턴 참조) |

---

### 🟡 지도 API 삽입 포인트

지도 API는 `data-map-api-slot` 속성이 붙은 div에 마운트합니다.

```html
<!-- AS 예약 2단계: 센터 지도 -->
<div class="locator-map as-center-map" id="asCenterMapApi"
     role="region" aria-label="방문 AS 서비스센터 지도 API 삽입 영역"
     data-map-api-slot>

<!-- 장착점·센터 찾기 -->
<div class="locator-map" id="locatorMapApi"
     role="region" aria-label="지도 API 삽입 영역"
     data-map-api-slot>
```

> 카카오맵 또는 네이버맵 Root 컨테이너로 사용하면 됩니다.

---

## 6. 개발 연동 우선순위 로드맵

```
Phase 1 — 인증 · 상태 제어
  ① 로그인 API 연동 → 로그인 성공 시 data-owned-product-state 전환
  ② 보유제품 조회 API → 제품 카드 동적 렌더링

Phase 2 — AS 예약 핵심 흐름
  ③ 지도 API 마운트 (카카오맵 or 네이버맵)
  ④ 서비스센터 목록 API → 센터 카드 동적 렌더링
  ⑤ AS 슬롯 API → SLOT_AVAIL 교체

Phase 3 — AI 채팅 연동
  ⑥ AI API 연동 → addAiMessage() 실제 응답 연결
  ⑦ 메시지 영속성 (대화 히스토리) 처리

Phase 4 — 부가 기능
  ⑧ button-feedback 45개 → 유형별 실제 액션 교체 (A~F 유형 참조)
  ⑨ 설문 form 제출 API
  ⑩ 예약 조회/변경/취소 API
```

---

## 7. 핸드오프 체크리스트

개발 착수 전 아래 항목을 확인하세요.

- [ ] Flatpickr CDN 버전을 `@4.6.13`으로 고정했는가
- [ ] 4개 HTML 파일의 CSS/JS `?v=` 버전이 모두 동일한가
- [ ] `loginForm`에 `action`, `method` 속성이 추가되었는가
- [ ] `survey-form`에 `action`, `method` 속성이 추가되었는가
- [ ] `SLOT_AVAIL` 더미 데이터를 API 응답으로 교체했는가
- [ ] AI 더미 응답 메시지를 실제 AI API로 교체했는가
- [ ] 예약자 정보 `value=""` 더미 데이터를 비웠는가
- [ ] `button-feedback` 45개를 유형별 실제 액션으로 교체했는가
- [ ] 지도 API가 `data-map-api-slot` 컨테이너에 정상 마운트되는가
- [ ] 로그인 성공 후 `data-owned-product-state` 전환이 정상 동작하는가

---

## 8. 참고 — 주석 마커 규칙

퍼블리싱 소스 전반에 다음 주석 마커가 사용됩니다.

| 마커 | 의미 |
|------|------|
| `[개발 연동]` | 개발 시 반드시 구현 또는 교체가 필요한 항목 |
| `[프로토타입]` | 더미 데이터 또는 임시 로직 — 프로덕션에서 제거/교체 필요 |
| `[참고]` | 개발팀에 알려두어야 할 설계 의도 또는 주의사항 |
| `[TODO]` | 추후 개선 권장 항목 (토큰 등록, 리팩터링 등) |

---

*문의: 퍼블리싱 담당자에게 연락하거나 함께 전달된 핸드오프 점검 보고서를 참조하세요.*
