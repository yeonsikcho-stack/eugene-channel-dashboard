// TODO: 인스타그램 비즈니스 계정 연동(Graph API) 전까지의 임시 더미 데이터.
// 실제 연동 정보가 오면 이 함수만 교체하면 된다.
export async function fetchInstagramSnapshot(): Promise<Record<string, number>> {
  return {
    followers: 3200,
    reach: 15400,
    saves: 210,
  };
}
