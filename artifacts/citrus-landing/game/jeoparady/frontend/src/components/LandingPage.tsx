import { PHOTOS } from '../lib/photos'
import PhotoTile from './PhotoTile'
import StartGameButton from './StartGameButton'

interface LandingPageProps {
  categoryTitles: string[]
  startingBalance: number
  onStart: () => void
}

const RULES = [
  { label: 'Starting balance', detail: 'Everyone begins with the same bankroll.' },
  { label: '20-second clock', detail: 'Answer before the host runs out of patience.' },
  { label: 'Right answers pay', detail: 'Correct picks add the tile value to your balance.' },
  { label: 'Wrong answers cost', detail: 'Misses and timeouts subtract the tile value instead.' },
]

const GALLERY = [
  { photo: PHOTOS.artMuseum, label: 'The Art Museum', detail: 'A wing-like brise soleil that opens over the lake every day.' },
  { photo: PHOTOS.skyline, label: 'The Lakefront', detail: 'Downtown meets Lake Michigan along miles of shoreline parks.' },
  { photo: PHOTOS.thirdWard, label: 'Historic Third Ward', detail: 'Old warehouses turned into galleries, shops, and studios.' },
  { photo: PHOTOS.riverwalk, label: 'The RiverWalk', detail: 'A walkable path tracing the river straight through downtown.' },
  { photo: PHOTOS.brewery, label: 'Brew City', detail: 'The brewing history that gave the city its nickname.' },
  { photo: PHOTOS.hoanBridge, label: 'Hoan Bridge', detail: 'The signature arch linking the harbor to the south side.' },
]

export default function LandingPage({ onStart }: LandingPageProps) {
  return (
    <div className="landing-page flex flex-1 flex-col gap-5 lg:gap-8">
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-center lg:gap-12">
        <div className="flex flex-col items-start gap-4 lg:gap-6">
          <div className="rounded-full bg-white px-4 py-1.5 dark:bg-brand-900">
            <span className="headline text-lg font-extrabold leading-none text-brand-900 dark:text-cream-100 lg:text-xl">
              A trivia game show
            </span>
          </div>
          <h1 className="headline m-0 text-[2.75rem] font-black leading-[0.9] text-brand-900 lg:text-[6.5rem] lg:leading-[0.86] dark:text-cream-100">
            Don&apos;t <span className="text-crimson-600 dark:text-crimson-400">Jeopardize</span> This!
          </h1>
          <p className="landing-intro m-0 max-w-xl text-base leading-relaxed text-ink-900/85 lg:text-lg dark:text-cream-100/80">
            Pick a tile, beat the 20-second clock, and grow your bankroll. Right answers pay. Wrong answers cost.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <StartGameButton onStart={onStart} />
          </div>
        </div>

        <div className="landing-media relative overflow-hidden rounded-[1.25rem] bg-black lg:rounded-3xl">
          <iframe
            className="absolute inset-0 h-full w-full"
            src="https://www.youtube.com/embed/2Tu_FrhXRSw?autoplay=1&mute=1&loop=1&playlist=2Tu_FrhXRSw&controls=1"
            title="Don't Jeopardize This! promo video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </section>

      <section
        id="house-rules"
        className="flex flex-col gap-2.5 rounded-3xl bg-ink-900 px-5 py-3.5 lg:gap-6 lg:rounded-[2rem] lg:px-12 lg:py-7"
      >
        <div className="flex items-end justify-between gap-6">
          <h2 className="headline m-0 text-xl font-black leading-[0.9] text-gold-500 lg:text-6xl">House rules</h2>
          <p className="m-0 hidden max-w-sm text-base text-cream-400 lg:block">
            Same bankroll, same clock, same odds. The only thing that changes is your nerve.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-2 lg:grid-cols-4 lg:gap-8">
          {RULES.map((rule, i) => (
            <div key={rule.label} className="flex gap-2 border-t-2 border-brand-400 pt-1.5 lg:flex-col lg:gap-2 lg:pt-5">
              <span className="headline text-base font-black leading-[0.9] text-brand-400 lg:text-[3.25rem]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex flex-col gap-0.5 lg:gap-1">
                <span className="headline text-xs font-extrabold leading-none text-cream-100 lg:text-[1.75rem]">
                  {rule.label}
                </span>
                <span className="hidden text-sm leading-snug text-cream-400 sm:block lg:text-base">{rule.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-strip grid-cols-3 gap-3 lg:grid-cols-6 lg:gap-4">
        {GALLERY.map(({ photo, label, detail }) => (
          <div key={label} className="flex flex-col gap-1.5">
            <PhotoTile photo={photo} className="landing-strip-photo" />
            <span className="headline text-xs font-extrabold leading-none text-ink-900 dark:text-cream-100 lg:text-sm">
              {label}
            </span>
            <span className="hidden text-xs leading-snug text-ink-900/70 lg:block dark:text-cream-400">{detail}</span>
          </div>
        ))}
      </section>
    </div>
  )
}
