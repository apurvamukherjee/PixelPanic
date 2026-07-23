import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { WordPackDetail } from "@pixelpanic/shared";
import { getAnonId } from "../lib/anonId";
import {
  fetchMyWordPacks,
  createWordPack,
  updateWordPack,
  deleteWordPack,
  wordPackExportUrl,
  type WordInput,
} from "../lib/api";
import { Button } from "../components/shared/Button";
import { Icon } from "../components/shared/Icon";
import { WordPackEditorModal } from "../components/wordpacks/WordPackEditorModal";

export function WordPackBuilderPage() {
  const navigate = useNavigate();
  const anonId = getAnonId();
  const [packs, setPacks] = useState<WordPackDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<WordPackDetail | null>(null);

  const reload = () => {
    setLoading(true);
    fetchMyWordPacks(anonId)
      .then(setPacks)
      .finally(() => setLoading(false));
  };

  useEffect(reload, [anonId]);

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (pack: WordPackDetail) => {
    setEditing(pack);
    setEditorOpen(true);
  };

  const handleSave = async (name: string, words: WordInput[]) => {
    if (editing) {
      await updateWordPack(editing.id, anonId, { name, words });
    } else {
      await createWordPack(anonId, name, words);
    }
    reload();
  };

  const handleDelete = async (pack: WordPackDetail) => {
    if (!confirm(`Delete "${pack.name}"?`)) return;
    await deleteWordPack(pack.id, anonId);
    reload();
  };

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            className="mb-1 flex items-center gap-1 font-mono text-xs uppercase tracking-wide text-on-surface-variant hover:text-secondary"
            onClick={() => navigate("/")}
          >
            <Icon name="arrow_back" className="!text-sm" /> Home
          </button>
          <h1 className="font-display text-2xl font-extrabold text-on-surface">My word packs</h1>
        </div>
        <Button onClick={openCreate}>+ New pack</Button>
      </div>

      {loading && <div className="text-sm text-on-surface-variant">Loading…</div>}
      {!loading && packs.length === 0 && (
        <div className="glass rounded-2xl p-4 text-sm text-on-surface-variant">
          You haven't created any word packs yet. New packs show up in the "Word list" dropdown
          when hosting a room.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {packs.map((pack) => (
          <div key={pack.id} className="glass flex items-center justify-between rounded-xl px-4 py-3">
            <div>
              <div className="font-display font-medium text-on-surface">{pack.name}</div>
              <div className="font-mono text-xs text-on-surface-variant">{pack.words.length} words</div>
            </div>
            <div className="flex gap-2">
              <a
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-on-surface-variant hover:bg-white/5 hover:text-secondary"
                href={wordPackExportUrl(pack.id)}
                download
              >
                <Icon name="download" className="!text-base" /> Export
              </a>
              <Button variant="secondary" onClick={() => openEdit(pack)}>
                Edit
              </Button>
              <Button variant="danger" onClick={() => handleDelete(pack)}>
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      <WordPackEditorModal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        editing={editing}
        onSave={handleSave}
      />
    </div>
  );
}
