export interface WordPack {
  id: string;
  name: string;
  isBuiltIn: boolean;
  words: string[];
}

// Builder-only shape (word-pack CRUD screen). Kept separate from WordPack so
// gameplay code (WordSelector, RoomManager.resolveWordPack, WordChoiceOverlay)
// never has to deal with per-word categories or ownership — zero blast radius
// on the existing gameplay path.
export interface WordPackDetailWord {
  text: string;
  category: string | null;
}

export interface WordPackDetail {
  id: string;
  name: string;
  isBuiltIn: boolean;
  ownerAnonId: string | null;
  words: WordPackDetailWord[];
}
