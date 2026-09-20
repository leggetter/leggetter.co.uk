# Audio credits

Six samples used by the `classic` presentation package of the Dead Ball penalty
game. The glove, the woodwork and the referee's whistle are still synthesised
at runtime and have no source to credit.

This repository is public, so committing a sample redistributes it, which is
why every licence here was read before the file went in. This document is the
record of that, and what lets anyone else check the same thing without taking
it on trust.

**The set is not all under one licence, but none of it requires attribution.**
Five files are CC0 1.0, which imposes no obligation at all. `goal.mp3` is under
the **Pixabay Content License**, which does not require attribution either but
is more restrictive in another way; the entry below says so plainly along with
the clause that matters. That was a deliberate choice after hearing the
alternatives, not an oversight.

**Attribution-required licences are not used here, and that is a rule rather
than a coincidence.** CC-BY would permit everything this project needs, and the
obligation is small - credit the author, note the change, link the licence. But
it has to be discharged where a person *using* the work can find it, not only
in a repository file like this one, which would mean the game growing a credits
screen and every future contributor remembering why. A standard nobody has to
remember beats a small obligation that compounds. So: CC0, or a licence that
explicitly says attribution is not required.

Which makes this file evidence rather than compliance. Nothing here is legally
required to be credited; it is written down so that the check is auditable and
so the next person does not have to take it on trust.

All were retrieved on **2026-09-19**.

Three of the six — the bed, the save and the groan — come from one afternoon at
one ground, recorded by one person on one machine, so they sit together rather
than sounding assembled. The cheer comes from elsewhere and was chosen by ear
over a matched one from that same recording.

Each file was cut from its source, converted to mono, filtered and re-encoded
as mp3. CC0 permits modification; the durations and levels below describe the
file in this directory, not the original.

## crowd.mp3 — the crowd bed, looped

- Source: https://freesound.org/s/494360/
- Author: `Sandermotions` (Freesound.org user)
- Licence: CC0 1.0 Universal (public domain dedication)
- Retrieved: 2026-09-19
- This copy: 9.5 s, mono, 24 kHz, 64 kbps
- Taken from: the first 11 seconds of the source, which measured as the
  liveliest stretch of the opening — around -24 dB and pulsing, against -28 dB
  and flat from about seven seconds in.
- Changes: high-passed at 70 Hz, level-flattened, loudness-normalised,
  downmixed to mono, and cross-faded head-over-tail so it loops without a seam
  (head and tail measure within 0.3 dB of each other).
- Note: these bytes were cut from Pixabay's mirror of this upload rather than
  from Freesound, which is why the sample rate is 24 kHz. Same recording, same
  CC0 dedication; the Freesound page above is the canonical source of the work.

## goal.mp3 — the crowd cheering a goal

- Source: https://pixabay.com/sound-effects/people-crowd-cheering-379666/
- Author: `u_xg7ssi08yr` (Pixabay user)
- Licence: **Pixabay Content License** — *not* CC0
- Retrieved: 2026-09-19
- This copy: 6.5 s, mono, 44.1 kHz, 96 kbps
- Taken from: **1.7 s** into the 16 s source, where the shout itself begins.
  The source is digitally silent to 0.7 s and then has a quiet build from 0.8
  to 1.5 s before the crowd actually goes up. Trimming only the silence kept
  that build, and it was audible in the game as the cheer arriving late after
  the ball crossed - so the cut is on the shout, not on the first sound.
- Changes: cut at 1.7 s with a 20 ms fade-in to avoid a click, high-passed at
  60 Hz, 6.5 s long, faded out over the last 1.5 s, loudness-normalised,
  downmixed to mono. Reaches full level within 0.3 s.

**The licence, in full disclosure.** The Pixabay Content License permits free
commercial use without attribution, but states that you *"cannot sell or
distribute Content (either in digital or physical form) on a Standalone
basis"*. Committing an mp3 to a public repository is arguably distribution of a
standalone file — the file here is modified and embedded in a game, which
arguably clears it, but the clause is a restriction where CC0 has none.

This was chosen knowingly by the repository owner, who listened to it against a
CC0 alternative from the same recording as the bed and preferred this one. If
that call is ever revisited, replacing it is one file and this entry: the code
does not know what it is playing.

## save.mp3 — the collective "oooh" of a save

- Source: https://freesound.org/s/494362/
- Author: `Sandermotions` (Freesound.org user)
- Licence: CC0 1.0 Universal (public domain dedication)
- Retrieved: 2026-09-19
- This copy: 3.6 s, mono, 44.1 kHz, 80 kbps
- Changes: trimmed to the reaction, high-passed at 60 Hz, faded out,
  loudness-normalised, downmixed to mono.

## groan.mp3 — the groan when it goes nowhere

- Source: https://freesound.org/s/494359/
- Author: `Sandermotions` (Freesound.org user)
- Licence: CC0 1.0 Universal (public domain dedication)
- Retrieved: 2026-09-19
- This copy: 4.4 s, mono, 44.1 kHz, 80 kbps
- Changes: trimmed to the reaction, high-passed at 60 Hz, faded out,
  loudness-normalised, downmixed to mono.

## boot.mp3 — boot meets ball

- Source: https://freesound.org/s/555042/
- Author: `bittermelonheart` (Freesound.org user)
- Licence: CC0 1.0 Universal (public domain dedication)
- Retrieved: 2026-09-19
- This copy: 0.22 s, mono, 44.1 kHz, 96 kbps
- Changes: trimmed to the contact, faded out, peak trimmed 3 dB, downmixed to
  mono.

## net.mp3 — the ball arriving in the netting

- Source: https://freesound.org/s/813410/
- Author: `Luisa_Sanchez` (Freesound.org user)
- Licence: CC0 1.0 Universal (public domain dedication)
- Retrieved: 2026-09-19
- This copy: 0.55 s, mono, 44.1 kHz, 96 kbps
- Changes: trimmed to the transient, high-passed at 110 Hz to drop the room
  rumble, faded out, loudness-normalised (the source is a very quiet
  recording), downmixed to mono.
