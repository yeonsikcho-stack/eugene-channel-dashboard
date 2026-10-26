# 채널 운영 지표 대시보드 — 디자인 시스템

## 방향 & 느낌

**"브리핑 데스크"** — 신문사 편집국 브리핑 보드. 따뜻한 종이 배경 위에 잉크 네이비 텍스트, 단일 액센트 블루. 홍보팀 담당자가 매달/매주 열어서 "지금 현황이 어떤지" 빠르게 훑고 윗선에 보고할 근거를 찾는 화면 — 분석 도구라기보다 브리핑 문서에 가깝게.

## 토큰 (app/globals.css)

```css
--ink: #14161f;           /* 기본 텍스트 */
--ink-secondary: #53566a; /* 보조 텍스트 */
--ink-muted: #8a8da0;     /* 라벨/메타 */
--paper: #faf9f5;         /* 페이지 배경 (순백 아님, 따뜻한 종이색) */
--surface: #ffffff;       /* 카드 배경 */
--border: rgba(20, 22, 31, 0.09);
--border-soft: rgba(20, 22, 31, 0.06);
--accent: #2451e0;        /* 단일 액센트 — 링크, 차트 라인, 강조 */
--accent-soft: #eef2fe;
--success: #16794f;       /* 상승 (Badge green과 별개, 아직 미적용) */
--danger: #c23b3b;        /* 하락 */
```

사이드바/모바일 헤더는 `#14161f`(ink) 고정. Badge 컴포넌트의 green/red/blue/gray는 그대로 유지 (톤 호환됨, 별도 교체 안 함).

## 깊이 전략

Border-only. 그림자는 KPI 타일에 아주 옅은 한 겹만 (`0 1px 2px rgba(20,22,31,0.04)`). 카드 간 구분은 `--border`, 카드 내부 구분선은 `--border-soft`.

## 타이포 / 밀도

- 페이지 제목 22px/600
- KPI 히어로 숫자 28px/600, `tabular-nums`
- 채널 카드 지표 값 18px(text-lg)/600
- 라벨 11px, `tracking-wide` 또는 `uppercase`로 보조 텍스트 구분
- 카드 패딩은 기존 Card 컴포넌트(`p-4`) 유지, KPI 타일은 `p-5`로 약간 더 여유

## 레이아웃 패턴

- **오늘의 브리핑**: `bg-[var(--ink)]` 다크 박스, 자동 생성 인사이트 2~3줄(`buildInsights` in `lib/overview.ts`) — 가장 많이 오른 지표 / 가장 많이 내린 지표 / 발행량 증감
- **KPI 4분할**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` — 반드시 `sm` 단계를 거쳐야 좁은 화면에서 숫자가 안 잘림
- **채널 카드 그리드**: `grid-cols-1 md:grid-cols-2 gap-4 items-start` — `items-start` 필수. 채널마다 지표 개수가 달라서 카드 높이가 다른데, 기본값(stretch)이면 짧은 카드가 불필요하게 늘어남
- **기간 비교 컨트롤**(`components/PeriodControls.tsx`): 기준월 + 비교 대상(전월/전년동월/직접선택) — `shiftYearMonth`/`sameMonthLastYear`로 비교월 계산, URL 쿼리(`yearMonth`, `compareMonth`)로 상태 유지

## 반응형 — 반드시 지킬 것

- **사이드바는 `hidden md:flex`, 모바일은 별도 `sticky` 상단 바**(`app/layout.tsx`). 전체 화면을 못 고려하면 모바일에서 사이드바가 고정폭을 그대로 먹어 본문이 짓눌림 — 실제로 한 번 발생했던 버그.
- `main`은 `md:ml-52`로, 모바일에서는 마진 없음.

## 재사용 컴포넌트

- `KpiTile` (app/page.tsx 내부) — label 11px uppercase · value 28px/600 tabular-nums · ChangeBadge · scopeNote 11px muted. 2회 이상 쓰이면 `components/`로 분리 고려.
- `Sparkline`/`TrendChart` 라인 색상은 `--accent`(#2451e0)로 통일.
