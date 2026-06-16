import ConsumerMenuContent from './ConsumerMenuContent'

export default function ConsumerDashboard({ compact = false }) {
  return (
    <ConsumerMenuContent showIntro={!compact} />
  )
}
