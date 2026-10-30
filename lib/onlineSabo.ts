// TODO: 유진에버 API key를 업체에 요청해 받기로 함. 키 전달 전까지의 임시 더미 데이터.
// 키가 오면 이 함수만 실제 API 호출로 교체하면 된다.
export async function fetchOnlineSaboSnapshot(): Promise<Record<string, number>> {
  return {
    visitors: 4800,
    views: 9700,
  };
}
