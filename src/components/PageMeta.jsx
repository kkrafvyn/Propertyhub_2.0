import { useEffect } from 'react'

export default function PageMeta({ title, description, path, image }) {
  useEffect(() => {
    const base = 'BaytMiftah'
    document.title = title ? `${title} · ${base}` : base

    const setMeta = (name, content) => {
      if (!content) return
      let el = document.querySelector(`meta[name="${name}"]`) || document.querySelector(`meta[property="${name}"]`)
      if (!el) {
        el = document.createElement('meta')
        if (name.startsWith('og:')) el.setAttribute('property', name)
        else el.setAttribute('name', name)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }

    setMeta('description', description)
    setMeta('og:title', title ? `${title} · ${base}` : base)
    setMeta('og:description', description)
    if (path) setMeta('og:url', `${window.location.origin}${path}`)
    if (image) setMeta('og:image', image)

    let script = document.getElementById('listing-jsonld')
    if (title && description) {
      if (!script) {
        script = document.createElement('script')
        script.id = 'listing-jsonld'
        script.type = 'application/ld+json'
        document.head.appendChild(script)
      }
      script.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'RealEstateListing',
        name: title,
        description,
        url: path ? `${window.location.origin}${path}` : window.location.href,
        image,
      })
    } else if (script) {
      script.remove()
    }
  }, [title, description, path, image])

  return null
}
