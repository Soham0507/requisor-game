export interface SceneDef {
  id: string;
  name: string;
  tagline: string;
  description: string;
  imagePrompt: string;
  videoPrompt: string;
}

export const SCENES: SceneDef[] = [
  {
    id: "pontoon-sunset",
    name: "Sunset Pontoon Cruise",
    tagline: "Golden hour on the water",
    description:
      "Glide across a glassy lake aboard a luxury pontoon as the sun melts into the horizon.",
    imagePrompt:
      "Place this exact person on the front lounge of a luxury tritoon pontoon boat during a golden-hour sunset cruise on a calm lake. They are relaxed and smiling, holding a cold drink, warm orange and pink sunset light reflecting off the water, distant tree-lined shore, gentle ripples. Preserve the person's exact facial features, identity, skin tone, hair and likeness perfectly. Photorealistic, shot on a full-frame camera, shallow depth of field, natural lighting, lifestyle photography with image ratio 1:1.",
    videoPrompt:
      "Gentle cinematic motion with ratio 1:1 : the pontoon glides slowly forward across the calm lake, water ripples shimmer, sunset light flickers warmly, the person's hair moves softly in the breeze, subtle camera push-in. Smooth, serene, photorealistic.",
  },
  {
    id: "wakesurfing",
    name: "Wakesurf Session",
    tagline: "Carve the endless wave",
    description:
      "Ride the clean wake behind a premium tow boat on a bright, fun summer afternoon.",
    imagePrompt:
      "Place this exact person wakesurfing on a clean glassy wake behind a premium inboard tow boat on a bright sunny summer day. They are standing confidently on a wakesurf board, carving the wave, spray of water, big smile, vibrant blue lake, clear sky. Preserve the person's exact facial features, identity, skin tone, hair and likeness perfectly. Photorealistic, action sports photography, crisp water spray, dynamic, natural sunlight with image ratio 1:1.",
    videoPrompt:
      "Dynamic action with ratio 1:1 : the person rides the wake, carving along the rolling wave with water spraying, the tow boat moving ahead, energetic summer motion, droplets glistening in sunlight, slight camera tracking. Photorealistic, lively.",
  },
  {
    id: "bass-fishing",
    name: "Trophy Bass Catch",
    tagline: "The one that didn't get away",
    description:
      "Land a trophy largemouth bass from a sleek bass boat in calm golden-hour light.",
    imagePrompt:
      "Place this exact person on a sleek metallic bass boat at golden hour, proudly holding up a large trophy largemouth bass they just caught. Calm reflective water, reeds along the shoreline, warm low sunlight, fishing rods in holders. They are grinning with excitement. Preserve the person's exact facial features, identity, skin tone, hair and likeness perfectly. Photorealistic, outdoor lifestyle photography, warm natural light, sharp detail with image ratio 1:1.",
    videoPrompt:
      "Subtle lively motion with ratio 1:1 : the person proudly hoists the bass which wriggles slightly, water gently ripples around the boat, warm golden light shimmers, reeds sway in a light breeze, gentle camera push-in. Photorealistic, celebratory.",
  },
];

export function getScene(id: string): SceneDef | undefined {
  return SCENES.find((s) => s.id === id);
}
