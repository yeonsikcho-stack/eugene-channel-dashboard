# Spec — metrics-store

## Problem Statement

담당자가 매달 유진에버·유튜브·인스타그램·네이버 블로그 4개 채널의 지표를 엑셀에 옮겨 적고, 이번 달과 지난달을 나란히 놓아 증감을 손으로 계산한다. 이 계산과 보관이 채널마다, 화면마다 따로 이루어지면 숫자가 서로 어긋나거나 매번 다시 계산해야 한다.

channel-dashboard, manual-metrics-entry, 각 collector, monthly-summary-view, metrics-trend-chart가 모두 같은 지표 숫자와 같은 증감 계산 결과를 봐야 한다. 이를 한 곳에 모아두지 않으면 기능마다 증감 계산 규칙이 흩어지고 어긋날 위험이 있다.

## Solution

채널별·월별 지표 값을 저장하고, 전월 대비 증감(증감폭·증감률)을 한 곳에서 계산해 다른 모든 기능에 제공하는 공유 저장소.

- 지표는 (채널, 지표 종류, 연·월) 단위로 저장된다.
- 저장된 값이 자동 수집(auto)인지 수동 입력(manual)인지 구분하며, 수동으로 고친 값은 다음 자동 수집이 덮어쓰지 않도록 표시를 남긴다.
- 특정 채널·특정 월의 지표를 조회하면, 지난달 값과 나란히 놓은 증감폭·증감률·증가/감소 표시가 함께 계산되어 나온다.
- 지난달 데이터가 없거나 지난달 값이 0인 경우를 규칙으로 처리해, 호출하는 쪽이 매번 예외 처리를 하지 않아도 된다.

## User Stories

1. As a 담당자, I want 채널별·월별 지표 값이 한 곳에 저장되길, so that 화면마다 숫자가 어긋나지 않는다.
2. As a 담당자, I want 이번 달 지표를 지난달과 비교한 증감폭과 증감률을 자동으로 계산해주길, so that 매달 엑셀에서 손으로 증감을 계산하지 않아도 된다.
3. As a 담당자, I want 지표가 늘었는지 줄었는지 ▲▼로 바로 구분되길, so that 숫자를 일일이 비교하지 않아도 한눈에 안다.
4. As a 담당자, I want 지난달 데이터가 없을 때 증감이 이상한 값(예: 0에서 100% 증가)으로 나오지 않고 "비교 불가"로 표시되길, so that 잘못된 증감률을 윗선에 보고하지 않는다.
5. As a 담당자, I want 지난달 값이 0이어서 증감률을 나눌 수 없을 때도 증감폭은 보이길, so that 최소한의 변화는 확인할 수 있다.
6. As a 담당자, I want 특정 월·특정 채널의 지표를 수동으로 입력하거나 고치면 그 값이 저장되길, so that 자동 수집이 안 되는 채널도 대시보드에 숫자가 채워진다.
7. As a 담당자, I want 수동으로 고친 값이 다음 자동 수집에 덮어써지지 않길, so that 어렵게 고친 값이 다시 틀린 값으로 되돌아가지 않는다.
8. As a youtube-collector/instagram-collector/naver-blog-collector/online-sabo-collector, I want 수집한 값을 채널·지표·연월에 맞춰 저장할 수 있길, so that 수집 로직이 저장 방식을 따로 구현하지 않아도 된다.
9. As a 담당자, I want 각 지표 값이 자동 수집인지 수동 입력인지 구분되어 저장되길, so that 대시보드에서 "자동/수동" 여부를 보여줄 수 있다.
10. As a channel-dashboard, I want 특정 월의 4개 채널 지표와 전월 대비 증감을 한 번의 조회로 받을 수 있길, so that 화면을 열 때마다 여러 번 계산하지 않는다.
11. As a monthly-summary-view, I want 특정 월을 지정해 그 달의 지표와 증감을 조회할 수 있길, so that 과거 달을 선택해도 같은 증감 계산 규칙이 적용된다.
12. As a metrics-trend-chart, I want 채널별 지표의 여러 달 치 값을 한 번에 조회할 수 있길, so that 추이 그래프를 그릴 수 있다. (추이 조회만 범위에 포함, 그래프 자체는 out of scope)
13. As a 담당자, I want 같은 채널·지표·연월에 값을 다시 저장하면 새 행이 쌓이지 않고 기존 값이 갱신되길, so that 같은 달 데이터가 중복되지 않는다.
14. As a 개발자, I want 지표 종류(채널별로 다른 지표명)가 코드 한 곳에서 관리되길, so that 새 지표를 추가할 때 여러 파일을 찾아다니지 않는다.

## Implementation Decisions

**스키마 (schema.sql)**

- 단일 테이블 `channel_metrics`로 모든 채널·모든 지표를 저장한다.
  - `channel` — TEXT, `'online_sabo' | 'youtube' | 'instagram' | 'naver_blog'`
  - `metric_key` — TEXT, 채널별 지표 식별자 (아래 표)
  - `year_month` — TEXT, `'YYYY-MM'` 형식
  - `value` — REAL, 지표 값
  - `source` — TEXT, `'auto' | 'manual'`
  - `is_manual_override` — INTEGER(0/1), 수동으로 값을 고쳤는지 여부. 1이면 자동 수집이 덮어쓰지 않는다.
  - `collected_at` — TEXT, 값이 저장/갱신된 시각
  - `(channel, metric_key, year_month)`에 UNIQUE 제약을 두어, 같은 달 재수집·재입력 시 UPSERT로 갱신한다.

- 채널별 `metric_key` 목록 (타입과 1:1로 types/index.ts에 상수로도 선언):
  | channel | metric_key | 의미 |
  |---|---|---|
  | online_sabo | visitors, views | 방문자수, 조회수 |
  | youtube | subscribers, views, watch_time | 구독자수, 조회수, 시청시간 |
  | instagram | followers, reach, saves | 팔로워, 도달수, 저장수 |
  | naver_blog | views, visitors | 조회수, 방문자수 |

**증감 계산 규칙 (공유 로직, lib/metrics.ts)**

- 이번 달 값과 지난달 값을 나란히 놓고 계산:
  - 지난달 행이 없음 → 증감 "비교 불가"(N/A). 이번 달 값만 표시.
  - 지난달 값이 0이고 이번 달 값이 있음 → 증감폭은 계산(이번 달 값 − 0), 증감률은 "비교 불가"(0으로 나눌 수 없음).
  - 둘 다 있고 지난달 값이 0이 아님 → 증감폭 = 이번 달 − 지난달, 증감률 = 증감폭 / 지난달 × 100 (소수 첫째 자리까지).
  - 증감폭 기준으로 방향 표시: 양수 ▲, 음수 ▼, 0이면 변동없음(—).
- 이 계산 함수는 순수 함수로 lib/metrics.ts에 두고, API route(Application 레이어)에서 호출해 응답에 포함시킨다. DB 접근(lib/db.ts)과는 분리한다.

**API 계약 (app/api/metrics/route.ts)**

- `GET /api/metrics?yearMonth=YYYY-MM` — 해당 월 4개 채널의 모든 지표를 반환하되, 각 지표에 이번 달 값·지난달 값·증감폭·증감률·방향·source·collected_at·is_manual_override를 함께 계산해 응답. (`yearMonth` 생략 시 가장 최근 데이터가 있는 월을 기준으로 함)
- `GET /api/metrics?channel=X&fromMonth=YYYY-MM&toMonth=YYYY-MM` — 특정 채널의 여러 달 치 원본 값 목록 반환 (추이 조회용, 증감 계산 없이 원본 값만).
- `PUT /api/metrics` — 단일 지표 UPSERT. body: `{ channel, metricKey, yearMonth, value, source }`.
  - `source: 'manual'`로 들어오면 `is_manual_override = 1`로 저장.
  - `source: 'auto'`로 들어올 때 기존 행의 `is_manual_override = 1`이면 값을 갱신하지 않고 거부(혹은 무시) — 수동 입력 보호가 metrics-store의 책임.
  - 같은 (channel, metric_key, year_month) 조합이면 새 행 대신 기존 행 갱신.

**타입 (types/index.ts)**

- `Channel`, `MetricKey`(채널별 유니온 혹은 채널-지표 매핑 타입), `MetricSource`, `ChannelMetric`, `MetricWithChange`(증감 계산 결과 포함) 타입을 이 파일에서 단일 관리.

## Out of Scope

- 지표를 수동으로 입력/수정하는 화면(입력 폼, 수정 UX)은 manual-metrics-entry의 범위. 이 스펙은 저장·조회·증감 계산 API까지만 다룬다.
- 각 채널에서 값을 실제로 가져오는 로직(API 연동, 로그인 세션 유지, 사내 DB 접속)은 각 collector 스펙(youtube-collector 등)의 범위.
- 지표 값 행을 삭제하는 기능은 다루지 않는다. 값을 고치는 유일한 방법은 같은 (채널, 지표, 월)에 새 값을 UPSERT하는 것.
- 여러 달 추이를 그래프로 그리는 것은 metrics-trend-chart의 범위. 이 스펙은 원본 값 목록 조회 API까지만 제공한다.
- 지표가 튄 원인을 분석하는 기능은 다루지 않는다 (PRD 범위 밖).

## Further Notes

- 지표의 시간 단위는 '월' 하나뿐이며, 모든 비교는 "바로 직전 월"과만 이루어진다. 분기·연 단위 비교는 다루지 않는다.
- 채널명·지표명은 담당자가 쓰는 말 그대로(유진에버, 도달수, 저장수, 시청시간 등) UI와 문서에 노출하되, DB의 `metric_key`는 영문 스네이크케이스로 둔다 — 한글 용어와 코드 식별자를 섞지 않는다.
- `is_manual_override`를 리셋해서 "다시 자동 수집이 덮어쓰게 하는" 기능이 필요한지는 manual-metrics-entry에서 다루며, 필요하다면 이 저장소에 리셋 API를 추가한다(현재 스펙에는 없음).
