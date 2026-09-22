// Shared between the games catalog (card disclaimer) and the customize page
// (device-preview toggle) so the two stay in sync — one list, not two copies
// that can drift apart.
//
// Space Shooter needs precise mouse-aim + click-to-fire (no touch equivalent
// wired up), and its sidebar already has known overflow issues at narrow
// widths. Gesture Space War's entire control scheme is webcam hand-gesture
// steering/firing as the PRIMARY input, not a fallback — awkward to frame a
// phone's camera while holding it, and heavier than a phone browser should
// take on. Neither has a mobile-friendly control path today.
export const MOBILE_UNSUPPORTED = new Set(["space-shooter-1", "gesture-space-war"]);

export const MOBILE_UNSUPPORTED_MESSAGE = "Not optimized for mobile — best played on Tab and desktop";
