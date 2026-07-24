const STORAGE_KEY = "pixelpanic-anon-id";
const NAME_KEY = "pixelpanic-name";
const AVATAR_KEY = "pixelpanic-avatar-id";

export function getAnonId(): string {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

export function getSavedName(): string {
  return localStorage.getItem(NAME_KEY) ?? "";
}

export function saveName(name: string): void {
  localStorage.setItem(NAME_KEY, name);
}

export function getSavedAvatarId(): string | null {
  return localStorage.getItem(AVATAR_KEY);
}

export function saveAvatarId(avatarId: string | null): void {
  if (avatarId) localStorage.setItem(AVATAR_KEY, avatarId);
  else localStorage.removeItem(AVATAR_KEY);
}
