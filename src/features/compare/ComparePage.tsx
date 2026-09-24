export default function ComparePage({ ids }: { ids: number[] }) {
  return <h1>Сравнение сценариев {ids.join(', ')}</h1>
}
