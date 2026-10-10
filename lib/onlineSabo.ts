// TODO: 사내 데이터베이스 접속 정보(DB 종류·주소·읽기전용 계정·지표 위치) 확인 전까지의 임시 더미 데이터.
// 실제 연동 정보가 오면 이 함수만 교체하면 된다.
export async function fetchOnlineSaboSnapshot(): Promise<Record<string, number>> {
  return {
    visitors: 4800,
    views: 9700,
  };
}
