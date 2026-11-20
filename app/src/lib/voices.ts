/**
 * Picks the most natural-sounding English voices a device offers for the podcast hosts:
 * Mia (female) and Leo (male). Pure logic, so it can be unit tested without a device.
 *
 * What different platforms call their best voices:
 * - Edge (Windows, macOS, Android): "Microsoft Ava Online (Natural) - English (United States)"
 * - Apple: identifiers with ".premium." or ".enhanced." (downloaded in Settings > Accessibility > Spoken Content)
 * - Chrome: "Google US English", "Google UK English Male"
 * - Android: Google voices such as "en-us-x-tpd-local"
 * Apple's novelty and Eloquence voices (Fred, Zarvox, Rocko, ...) sound robotic and are skipped.
 */

export interface VoiceInfo { identifier: string; name: string; language: string; quality?: string }
/** `same`: the hosts would sound alike (one voice, or genders unknown), so the app changes their pitch. */
export interface HostVoices { Mia?: string; Leo?: string; same: boolean }
type Gender = 'f' | 'm' | '?';

const FEMALE = /\b(ava|samantha|allison|susan|zoe|nicky|aria|jenny|michelle|emma|ana|sonia|libby|natasha|karen|moira|tessa|serena|kate|zira|joanna|salli|kendra|kimberly|ivy|ruth|nora|catherine|fiona|victoria|veena|female)\b/i;
const MALE = /\b(andrew|brian|guy|christopher|eric|roger|steffan|ryan|thomas|william|daniel|alex|tom|aaron|evan|nathan|oliver|arthur|rishi|david|mark|james|george|lee|matthew|joey|justin|kevin|stephen|male)\b/i;
/** Google voices on Android have codes instead of names. These are the male US and UK ones. */
const ANDROID_MALE = /en-(us|gb)-x-(iol|iom|tpd|gbd|gbb|rjs)/i;
const ANDROID_FEMALE = /en-(us|gb)-x-(iob|iog|sfg|tpc|tpf|gba|gbc|gbg|fis)/i;
/** Apple novelty and Eloquence voices: robotic or joke voices that would make the podcast sound worse. */
const ROBOTIC = /^(albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|junior|ralph|kathy|fred|eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley)\b/i;

export function voiceGender(v: VoiceInfo): Gender {
  const label = `${v.name} ${v.identifier}`;
  if (ANDROID_MALE.test(label)) return 'm';
  if (ANDROID_FEMALE.test(label)) return 'f';
  // "Google UK English Male": check male first, since names like "Female" contain "male".
  if (/\bmale\b/i.test(v.name)) return 'm';
  if (/^google us english$/i.test(v.name.trim())) return 'f'; // Chrome's main US voice is female
  if (FEMALE.test(v.name)) return 'f';
  if (MALE.test(v.name)) return 'm';
  return '?';
}

/** Higher is more natural. -1 means skip the voice. */
export function voiceScore(v: VoiceInfo): number {
  const lang = v.language.replace('_', '-');
  if (!/^en-/i.test(lang)) return -1;
  if (ROBOTIC.test(v.name) || /eloquence|speech\.synthesis\.voice\./i.test(v.identifier)) return -1;
  const label = `${v.name} ${v.identifier}`;
  let score = /^en-US/i.test(lang) ? 30 : /^en-(GB|AU|CA|IE|NZ)/i.test(lang) ? 15 : 8;
  if (/\b(natural|neural)\b/i.test(label)) score += 50; // Microsoft online neural voices (Edge)
  else if (/premium/i.test(label)) score += 45; // Apple premium voices
  else if (v.quality === 'Enhanced' || /enhanced/i.test(label)) score += 30; // Apple enhanced voices
  else if (/^google\b/i.test(v.name)) score += 25; // Chrome's Google voices
  else if (/-x-[a-z]{3}-local/i.test(v.identifier)) score += 25; // Android Google voices, work offline
  else if (/-x-[a-z]{3}-network/i.test(v.identifier)) score += 22; // same voices, but silent without internet
  else if (/^microsoft\b/i.test(v.name)) score += 5; // older Windows desktop voices
  else score += 10;
  return score;
}

export function pickHostVoices(voices: VoiceInfo[]): HostVoices {
  const ranked = voices
    .map((v) => ({ v, score: voiceScore(v), g: voiceGender(v) }))
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score);
  if (!ranked.length) return { same: true };
  const mia = ranked.find((x) => x.g === 'f') ?? ranked.find((x) => x.g === '?') ?? ranked[0];
  const leo = ranked.find((x) => x.g === 'm' && x !== mia) ?? ranked.find((x) => x.g === '?' && x !== mia) ?? ranked.find((x) => x !== mia);
  // Android often names voices only by language ("English United States"), so a female and a male
  // voice cannot be confirmed. Treat that like a single voice and separate the hosts by pitch.
  const confirmed = !!leo && mia.g === 'f' && leo.g === 'm';
  return { Mia: mia.v.identifier, Leo: (leo ?? mia).v.identifier, same: !confirmed };
}
