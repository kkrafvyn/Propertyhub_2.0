import { useEffect, useState } from 'react'

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  )

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = (event) => setMatches(event.matches)
    setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** Matches Tailwind `lg` — mobile/tablet below 1024px */
export function useIsMobileViewport() {
  return useMediaQuery('(max-width: 1023px)')
}

/** Tablet band 768–1023px (between md and lg) */
export function useIsTabletViewport() {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)')
}
