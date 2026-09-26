import { useEffect, useRef, useState } from 'react';
import { Pencil, Trash2, ChevronDown, ChevronUp, MapPin, Gauge, Clock3, Check, X, Inbox } from 'lucide-react';
import type { SmellMemory, LocationArchive } from '../../utils/constants';
import { getLocationStats, formatDate, formatRelativeDate } from '../../utils/helpers';
import MemoryMoveRow from './MemoryMoveRow';

interface Props {
  location: LocationArchive;
  memories: SmellMemory[];
  allLocations: LocationArchive[];
  isExpanded: boolean;
  onToggle: () => void;
  onRename: (name: string) => { ok: boolean; conflictWith?: string };
  onRemove: () => void;
  onMoveMemory: (memoryId: string, targetId: string | null) => void;
}

export default function LocationCard({
  location,
  memories,
  allLocations,
  isExpanded,
  onToggle,
  onRename,
  onRemove,
  onMoveMemory,
}: Props) {
  const stats = getLocationStats(memories);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(location.name);
  const [conflict, setConflict] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(location.name);
      setConflict(null);
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }, [editing, location.name]);

  const startEdit = () => setEditing(true);

  const submitRename = () => {
    const result = onRename(draft);
    if (result.ok) {
      setEditing(false);
      setConflict(null);
    } else {
      setConflict(result.conflictWith ?? '已存在同名档案');
    }
  };

  const handleRemove = () => {
    const msg = stats.count > 0
      ? `撤下「${location.name}」档案后，旗下 ${stats.count} 段记忆会退回「未归类」，记忆不会被删除。确认撤下吗？`
      : `确认撤下「${location.name}」档案吗？`;
    if (window.confirm(msg)) onRemove();
  };

  const otherLocations = allLocations.filter((l) => l.id !== location.id);

  return (
    <article className="bg-paper-50 rounded-2xl border border-paper-300 shadow-card overflow-hidden hover:shadow-paper-hover transition-shadow duration-300">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-ochre-100 text-ochre-600 flex items-center justify-center shrink-0 border border-ochre-200">
            <MapPin className="w-5 h-5" />
          </div>

          <div className="min-w-0 flex-1">
            {editing ? (
              <div>
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => { setDraft(e.target.value); setConflict(null); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitRename();
                    if (e.key === 'Escape') setEditing(false);
                  }}
                  className="scent-input py-1.5 text-lg font-serif font-semibold"
                  placeholder="正式名称"
                />
                {conflict && (
                  <p className="mt-1.5 text-xs text-brick-600 bg-brick-500/10 rounded-lg px-2.5 py-1.5">
                    ⚠️ 已存在「{conflict}」这份档案，归属保持原样。想合并的话，请把记忆逐段移过去后再撤下本档案。
                  </p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={submitRename}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-moss-500 hover:bg-moss-600 text-paper-50"
                  >
                    <Check className="w-3.5 h-3.5" /> 保存
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-paper-200 hover:bg-paper-300 text-ink-700"
                  >
                    <X className="w-3.5 h-3.5" /> 取消
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button onClick={onToggle} className="block w-full text-left group">
                  <h3 className="font-serif text-lg font-semibold text-ink-800 leading-snug group-hover:text-ochre-600 transition-colors break-words">
                    {location.name}
                  </h3>
                </button>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-700/70">
                  <span className="inline-flex items-center gap-1">
                    <Inbox className="w-3.5 h-3.5 text-ochre-500" />
                    <b className="text-ink-800">{stats.count}</b> 段记忆
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5 text-moss-500" />
                    平均强度 <b className="text-ink-800">{stats.averageIntensity || '—'}</b>
                  </span>
                  <span className="inline-flex items-center gap-1" title={stats.latestSealedAt ? formatDate(stats.latestSealedAt) : undefined}>
                    <Clock3 className="w-3.5 h-3.5 text-lavender-500" />
                    {stats.latestSealedAt
                      ? <>最近封存 · {formatRelativeDate(stats.latestSealedAt)}</>
                      : '还没有记忆'}
                  </span>
                </div>
              </>
            )}
          </div>

          {!editing && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={startEdit}
                title="改名"
                className="p-2 rounded-lg text-ochre-600 hover:bg-ochre-100 transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={handleRemove}
                title="撤下档案（记忆退回未归类）"
                className="p-2 rounded-lg text-brick-500 hover:bg-brick-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={onToggle}
                className="p-2 rounded-lg text-ink-700/60 hover:bg-paper-200 transition-colors"
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {isExpanded && !editing && (
        <div className="px-4 pb-4 animate-expand">
          <div className="pt-3 border-t border-paper-200/80 space-y-2">
            {memories.length === 0 ? (
              <p className="text-sm text-ink-700/50 py-2 text-center font-hand text-base">
                这份档案下还没有记忆
              </p>
            ) : (
              memories.map((m) => (
                <MemoryMoveRow
                  key={m.id}
                  memory={m}
                  locations={otherLocations}
                  onMove={(targetId) => onMoveMemory(m.id, targetId)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </article>
  );
}
