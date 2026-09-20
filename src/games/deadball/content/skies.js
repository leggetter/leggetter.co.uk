/**
 * What time it is.
 *
 * Three whole looks for the same stadium, and a Tier 1 file: every value here
 * is a colour or a number, nothing can break the game, and a change shows up
 * on the next refresh.
 *
 * The one thing that is not just taste: **`floodlight` and the sky have to
 * agree.** A glow only reads as light if there is darkness to put it in, so a
 * lit pylon against a bright noon sky looks like a mistake rather than a
 * floodlight. Hence 0 at midday, full at night, and half at dusk where a real
 * ground has them on and climbing.
 *
 *   top, bottom   the sky, from overhead down to the horizon
 *   cloud         cloud colour. Low alpha reads as haze, high as cumulus
 *   clouds        how many, roughly. Zero is a clear sky
 *   trees         the silhouette at the corners. Darker than the sky it is
 *                 seen against, or it disappears
 *   grassShade    painted over the pitch. Nothing at midday; blue and heavy
 *                 at night, which is most of what makes floodlit grass read
 *                 as floodlit
 *   floodlight    0 to 1, how hard the pylons glow
 */

export const SKIES = [
  {
    id: 'day',
    label: 'Day',
    top: '#2f7fd4',
    bottom: '#a8d4f2',
    cloud: 'rgba(255, 255, 255, 0.92)',
    clouds: 14,
    trees: '#1d3b23',
    grassShade: 'rgba(255, 246, 214, 0.05)',
    floodlight: 0,
  },
  {
    id: 'dusk',
    label: 'Dusk',
    // Deep overhead going warm at the horizon, which is the whole trick: a
    // two-stop gradient between colours that are nothing like each other is
    // what stops a sky reading as flat.
    top: '#1b2a5e',
    bottom: '#e88b4a',
    cloud: 'rgba(255, 196, 150, 0.7)',
    clouds: 16,
    trees: '#14161f',
    grassShade: 'rgba(60, 40, 90, 0.2)',
    floodlight: 0.55,
  },
  {
    id: 'night',
    label: 'Night',
    top: '#060b18',
    bottom: '#16263f',
    cloud: 'rgba(110, 130, 170, 0.22)',
    clouds: 8,
    trees: '#080a10',
    grassShade: 'rgba(20, 30, 70, 0.34)',
    floodlight: 1,
  },
];

export const DEFAULT_SKY_ID = 'dusk';
