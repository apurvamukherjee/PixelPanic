// Crockford base32 alphabet (excludes ambiguous 0/O, 1/I/L) so codes read
// clearly out loud or typed by hand.
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
