// Milwaukee photography for the landing and login screens. All from
// Wikimedia Commons under Creative Commons licences, which require the
// credit line to be shown wherever the photo is - PhotoTile renders it.
export interface Photo {
  src: string
  alt: string
  credit: string
}

export const PHOTOS = {
  artMuseum: {
    src: '/milwaukee/art-museum.jpg',
    alt: 'Milwaukee Art Museum on the lakefront',
    credit: 'Michael Hicks · CC BY 2.0',
  },
  skyline: {
    src: '/milwaukee/skyline.jpg',
    alt: 'Milwaukee skyline from Lakeshore State Park',
    credit: 'SecretName101 · CC BY 4.0',
  },
  thirdWard: {
    src: '/milwaukee/third-ward.jpg',
    alt: 'Historic Third Ward, Milwaukee',
    credit: 'SecretName101 · CC BY 4.0',
  },
  riverwalk: {
    src: '/milwaukee/riverwalk.jpg',
    alt: 'Milwaukee RiverWalk',
    credit: 'Michael Barera · CC BY-SA 4.0',
  },
  brewery: {
    src: '/milwaukee/brewery.jpg',
    alt: 'Lakefront Brewery, Milwaukee',
    credit: 'jgagnon · CC BY 2.0',
  },
  hoanBridge: {
    src: '/milwaukee/hoan-bridge.jpg',
    alt: 'Hoan Bridge, Milwaukee',
    credit: 'Corey Coyle · CC BY 3.0',
  },
} satisfies Record<string, Photo>
