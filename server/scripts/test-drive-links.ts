import { parseDriveFileId, parseBulkLinks } from '../src/lib/drive.js';

const ID = '1A2b3C4d5E6f7G8h9I0jKLmnopqrstuv';
const cases: [string, string | null][] = [
  [`https://drive.google.com/file/d/${ID}/view?usp=sharing`, ID],
  [`https://drive.google.com/open?id=${ID}`, ID],
  [`https://drive.google.com/uc?id=${ID}&export=download`, ID],
  [ID, ID],
  ['not a link', null],
];

let ok = cases.every(([input, want]) => parseDriveFileId(input) === want);

const bulk = parseBulkLinks(
  `https://drive.google.com/file/d/${ID}/view, https://drive.google.com/open?id=SECOND1234567890abcdef\nhttps://drive.google.com/file/d/${ID}/view`,
);
ok = ok && bulk.length === 2 && bulk[0] === ID; // dedupes the repeated one

console.log('single-parse:', cases.map(([i, w]) => (parseDriveFileId(i) === w ? '✓' : `✗(${i})`)).join(' '));
console.log('bulk (deduped):', bulk);
console.log(ok ? '\n✅ drive link parsing correct' : '\n❌ parsing mismatch');
process.exit(ok ? 0 : 1);
