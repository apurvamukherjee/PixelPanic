import { useEffect, useState } from "react";
import type { WordPackDetail } from "@pixelpanic/shared";
import { Modal } from "../shared/Modal";
import { Button } from "../shared/Button";
import type { WordInput } from "../../lib/api";

interface WordPackEditorModalProps {
  open: boolean;
  onClose: () => void;
  editing: WordPackDetail | null; // null = creating a new pack
  onSave: (name: string, words: WordInput[]) => Promise<void>;
}

// One word per line; an optional "word | category" suffix tags a category.
function wordsToText(words: { text: string; category: string | null }[]): string {
  return words.map((w) => (w.category ? `${w.text} | ${w.category}` : w.text)).join("\n");
}

function textToWords(text: string): WordInput[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [word, category] = line.split("|").map((s) => s.trim());
      return { text: word ?? "", category: category || null };
    });
}

export function WordPackEditorModal({ open, onClose, editing, onSave }: WordPackEditorModalProps) {
  const [name, setName] = useState("");
  const [wordsText, setWordsText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setWordsText(editing ? wordsToText(editing.words) : "");
    setError(null);
  }, [open, editing]);

  const submit = async () => {
    setError(null);
    setSaving(true);
    try {
      await onSave(name, textToWords(wordsText));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save pack");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="font-display text-sm font-bold uppercase tracking-wide text-on-surface-variant">
          {editing ? "Edit word pack" : "New word pack"}
        </div>
        <input
          className="rounded-lg border border-white/10 bg-background px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary"
          placeholder="Pack name"
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <textarea
          className="rounded-lg border border-white/10 bg-background px-3 py-2 font-mono text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary"
          rows={10}
          placeholder={"one word per line\noptionally: word | category"}
          value={wordsText}
          onChange={(e) => setWordsText(e.target.value)}
        />
        {error && <div className="text-xs text-error">{error}</div>}
        <div className="flex gap-2">
          <Button onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
