import { getListingPhotos, useListingPhotoCarousel } from '../hooks/useListingPhotoCarousel'

export function ListingCardImage({
  listing,
  photos: photosProp,
  className = '',
  imageClassName = 'h-full w-full object-cover',
  intervalMs,
  alt = '',
}) {
  const photos = photosProp ?? getListingPhotos(listing)
  const [index] = useListingPhotoCarousel(photos, intervalMs)

  if (!photos.length) {
    return <div className={`bg-surface-subtle ${className}`} aria-hidden />
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {photos.map((src, i) => (
        <img
          key={`${src}-${i}`}
          src={src}
          alt={alt}
          loading={i === 0 ? 'lazy' : undefined}
          className={`absolute inset-0 ${imageClassName} transition-opacity duration-700 ease-in-out ${
            i === index ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}
    </div>
  )
}
