import type { Photo } from '../lib/photos'

interface PhotoTileProps {
  photo: Photo
  label?: string
  className?: string
}

export default function PhotoTile({ photo, label, className = '' }: PhotoTileProps) {
  return (
    <figure className={`relative m-0 overflow-hidden rounded-[1.25rem] bg-brand-800 lg:rounded-3xl ${className}`}>
      <img src={photo.src} alt={photo.alt} className="absolute inset-0 h-full w-full object-cover" />
      {label && (
        <span className="headline absolute bottom-3 left-3 rounded-full bg-cream-100 px-3 py-1 text-base font-black leading-none text-brand-900 lg:bottom-4 lg:left-4 lg:px-4 lg:text-xl">
          {label}
        </span>
      )}
      <figcaption className="absolute right-2 top-2 rounded bg-black/45 px-1.5 py-0.5 text-[0.625rem] font-medium leading-tight text-white/90">
        Photo: {photo.credit}
      </figcaption>
    </figure>
  )
}
