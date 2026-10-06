/** Tailwind config for the Lexus Energy Quiz single-file build.
 *  preflight is OFF so Tailwind's CSS reset never touches the
 *  hand-tuned quiz styles. Rebuild command:
 *  pnpm run build:css (Tailwind v4 sources are in tailwind.input.css)
 */
module.exports = {
  content: ['./lexus_energy_quiz_tuned_v018.html'],
  corePlugins: { preflight: false },
  blocklist: ['visible'],  // quiz has its own .visible (opacity toggle)
  theme: { extend: {} },
  plugins: [],
};
