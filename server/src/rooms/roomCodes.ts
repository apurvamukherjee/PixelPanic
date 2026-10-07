// Crockford base32 alphabet (no I, L, O or U) so codes read clearly out
// loud or typed by hand.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const CODE_LENGTH = 6;

function randomCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

// Astronomically rare collisions at friend-group scale — a simple retry
// against the live room Map is all that's needed, no reservation scheme.
export function generateUniqueRoomCode(exists: (code: string) => boolean): string {
  let code = randomCode();
  while (exists(code)) {
    code = randomCode();
  }
  return code;
}

// Crockford decoding: a code read aloud or typed on a phone often comes back
// with O for 0 or I/L for 1 — those letters never appear in a real code.
export function normalizeRoomCode(input: string): string {
  return input.trim().toUpperCase().replace(/O/g, "0").replace(/[IL]/g, "1");
}
