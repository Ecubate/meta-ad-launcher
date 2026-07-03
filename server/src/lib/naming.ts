/**
 * Builds an ad name from the configured naming convention (Adnova "Ad Naming Convention" step).
 * Tokens: {{filename}} {{ad type}} {{date}} {{influencer}} {{product}} {{offer}}
 *         {{concept}} {{template name}} — plus any literal custom text.
 */

const SEPARATORS: Record<string, string> = {
  '_': '_',
  Underscore: '_',
  'Underscore _': '_',
  '-': '-',
  Dash: '-',
  'Dash -': '-',
  ' ': ' ',
  Space: ' ',
};

export function resolveSeparator(label: string): string {
  return SEPARATORS[label] ?? label ?? '_';
}

type NameVars = {
  filename: string;
  adType?: string;
  date?: string;
  influencer?: string;
  product?: string;
  offer?: string;
  concept?: string;
  templateName?: string;
  custom?: string;
  removeDimensions?: boolean;
  addSpaceAroundSeparator?: boolean;
};

function stripDimensions(filename: string): string {
  // Strip extension + trailing size like _1x1, _1080x1080, -4x5.
  return filename
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[_-]\d{1,4}\s?[x×]\s?\d{1,4}$/i, '')
    .replace(/[_-]\d{1,4}\s?[x×]\s?\d{1,4}(?=[_-])/i, '');
}

export function buildAdName(tokens: string[], separatorLabel: string, vars: NameVars): string {
  const sep = resolveSeparator(separatorLabel);
  const filename = vars.removeDimensions ? stripDimensions(vars.filename) : vars.filename.replace(/\.[a-z0-9]+$/i, '');
  const map: Record<string, string | undefined> = {
    '{{filename}}': filename,
    '{{ad type}}': vars.adType,
    '{{date}}': vars.date ?? new Date().toISOString().slice(0, 10),
    '{{influencer}}': vars.influencer,
    '{{product}}': vars.product,
    '{{offer}}': vars.offer,
    '{{concept}}': vars.concept,
    '{{template name}}': vars.templateName,
  };
  const parts = tokens
    .map((t) => (t in map ? map[t] : t)) // unknown token → treat as literal custom text
    .filter((p): p is string => !!p && p.trim() !== '');
  const joiner = vars.addSpaceAroundSeparator ? ` ${sep} ` : sep;
  return parts.join(joiner);
}
