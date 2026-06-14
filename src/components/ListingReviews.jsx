import { useEffect, useState } from 'react'
import { useTranslation } from '../i18n/LocaleContext'
import { fetchReviews, submitReview } from '../services/review-service'
import { useAuth } from '../context/AuthContext'

export default function ListingReviews({ listingId }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [reviews, setReviews] = useState([])
  const [rating, setRating] = useState(5)
  const [body, setBody] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    fetchReviews(listingId).then(({ reviews: rows }) => setReviews(rows))
  }, [listingId])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!user) {
      setStatus(t('reviews.signIn'))
      return
    }
    const { review } = await submitReview({ listingId, rating, body })
    if (review) {
      setReviews((prev) => [{
        id: review.id,
        rating: review.rating,
        body: review.body,
        author: review.author || 'You',
        created_at: review.created_at,
      }, ...prev])
      setBody('')
      setStatus(t('reviews.thanks'))
    }
  }

  return (
    <section className="border-t border-surface-border pt-8">
      <h2 className="mb-4 text-xl font-semibold">{t('reviews.title')}</h2>
      {reviews.length === 0 ? (
        <p className="text-sm text-ink-secondary">{t('reviews.empty')}</p>
      ) : (
        <ul className="mb-6 space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-lg border border-surface-border p-4 text-sm">
              <p className="font-semibold">{r.author} · {r.rating}/5</p>
              {r.body && <p className="mt-1 text-ink-secondary">{r.body}</p>}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-surface-border p-4">
        <p className="text-sm font-semibold">{t('reviews.leaveReview')}</p>
        <label className="block text-sm">
          {t('reviews.rating')}
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2">
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder={t('reviews.placeholder')} className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm" />
        <button type="submit" className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white">{t('reviews.submit')}</button>
        {status && <p className="text-sm text-ink-secondary">{status}</p>}
      </form>
    </section>
  )
}
