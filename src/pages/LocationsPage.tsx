import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Pencil,
  Trash2,
  Check,
  X,
  AlertTriangle,
  GitMerge,
  Inbox,
  ArrowLeft,
  Gauge,
  Clock,
  Layers,
} from 'lucide-react';
import { useMemoryStore } from '../store/memoryStore';
import type { ArchiveOpResult } from '../store/memoryStore';
import type { LocationArchive, SmellMemory } from '../utils/constants';
import {
  getLocationStatsMap,
  getUnclassifiedMemories,
  emptyStats,
  formatDate,
} from '../utils/helpers';

export default function LocationsPage() {
  const {
    memories,
    locations,
    initIfEmpty,
    renameLocation,
    mergeLocation,
    removeLocation,
    moveMemory,
  } = useMemoryStore();

  useEffect(() => {
    initIfEmpty();
  }, [initIfEmpty]);

  // 所有统计都从 memories + locations 实时派生：记忆一移动，这里立刻重算
  const statsMap = useMemo(() => getLocationStatsMap(memories), [memories]);
  const membersMap = useMemo(() => {
    const map = new Map<string, SmellMemory[]>();
    for (const m of memories) {
      if (m.locationId === null) continue;
      const list = map.get(m.locationId) ?? [];
      list.push(m);
      map.set(m.locationId, list);
    }
    return map;
  }, [memories]);

  const unclassified = useMemo(
    () => getUnclassifiedMemories(memories, locations),
    [memories, locations],
  );

  const ordered = useMemo(() => {
    return [...locations].sort((a, b) => {
      const ta = statsMap.get(a.id)?.latestSealedAt ?? '';
      const tb = statsMap.get(b.id)?.latestSealedAt ?? '';
      return tb.localeCompare(ta);
    });
  }, [locations, statsMap]);

  return (
    <div className="min-h-screen">
      <header className="pt-10 pb-6 md:pt-14">
        <div className="container max-w-6xl">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-ochre-600 hover:text-ochre-700 mb-4 font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> 返回气味档案
          </Link>
          <h1 className="font-serif text-3xl md:text-5xl font-bold text-ink-800 leading-tight">
            地点<span className="text-ochre-500">档案</span>馆
          </h1>
          <p className="mt-2 font-hand text-lg text-ink-700/70">
            每个地点只保留唯一的正式名称 · 改名撞名会被拦下，撤下档案只会让记忆退回未归类
          </p>
          <div className="mt-4 h-px w-full" style={{ background: 'linear-gradient(90deg, transparent 0%, #CBB993 20%, #CBB993 80%, transparent 100%)' }} />
        </div>
      </header>

      <main className="container max-w-6xl pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {ordered.map((archive) => (
            <LocationCard
              key={archive.id}
              archive={archive}
              members={membersMap.get(archive.id) ?? []}
              stats={statsMap.get(archive.id) ?? emptyStats()}
              allLocations={locations}
              onRename={(name) => renameLocation(archive.id, name)}
              onMerge={(targetId) => mergeLocation(archive.id, targetId)}
              onRemove={() => removeLocation(archive.id)}
              onMoveMemory={moveMemory}
            />
          ))}
        </div>

        <UnclassifiedPanel
          memories={unclassified}
          allLocations={locations}
          onMoveMemory={moveMemory}
        />
      </main>
    </div>
  );
}

/* ---------------- 单个地点档案卡片 ---------------- */

interface CardProps {
  archive: LocationArchive;
  members: SmellMemory[];
  stats: ReturnType<typeof emptyStats>;
  allLocations: LocationArchive[];
  onRename: (name: string) => ArchiveOpResult;
  onMerge: (targetId: string) => void;
  onRemove: () => void;
  onMoveMemory: (memoryId: string, targetId: string | null) => void;
}

function LocationCard({
  archive,
  members,
  stats,
  allLocations,
  onRename,
  onMerge,
  onRemove,
  onMoveMemory,
}: CardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(archive.name);
  const [expanded, setExpanded] = useState(false);
  const [conflict, setConflict] = useState<{ id: string; name: string } | null>(null);

  const startEdit = () => {
    setDraft(archive.name);
    setConflict(null);
    setEditing(true);
  };

  const saveRename = () => {
    const result = onRename(draft);
    if (result.status === 'ok') {
      setEditing(false);
      setConflict(null);
    } else if (result.status === 'conflict') {
      // 撞名：保留原归属，不改任何数据，只展示冲突
      setConflict({ id: result.conflictId, name: result.conflictName });
    }
  };
  const handleRemove = () => {
    const ok = window.confirm(
      `撤下「${archive.name}」后，旗下 ${stats.count} 段记忆会退回「未归类」，记忆本身不会被删除。确定撤下吗？`,
    );
    if (ok) onRemove();
  };

  const handleMerge = () => {
    if (!conflict) return;
    const ok = window.confirm(
      `把「${archive.name}」旗下 ${stats.count} 段记忆全部并入「${conflict.name}」？并入后本档案将撤下。`,
    );
    if (ok) {
      onMerge(conflict.id);
      setConflict(null);
      setEditing(false);
    }
  };

  const otherLocations = allLocations.filter((a) => a.id !== archive.id);

  return (
    <article className="bg-paper-50/90 backdrop-blur rounded-2xl border border-paper-300 shadow-card p-5 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="w-10 h-10 rounded-xl bg-ochre-100 text-ochre-600 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5" />
          </span>
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveRename();
                if (e.key === 'Escape') setEditing(false);
              }}
              className="scent-input py-1.5 font-serif text-lg"
            />
          ) : (
            <h2 className="font-serif text-xl font-semibold text-ink-800 truncate" title={archive.name}>
              {archive.name}
            </h2>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {editing ? (
            <>
              <button
                onClick={saveRename}
                className="p-2 rounded-lg text-moss-600 hover:bg-moss-100 transition-colors"
                title="保存名称"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setEditing(false); setConflict(null); }}
                className="p-2 rounded-lg text-ink-700/60 hover:bg-paper-200 transition-colors"
                title="取消"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={startEdit}
                className="p-2 rounded-lg text-ochre-600 hover:bg-ochre-100 transition-colors"
                title="改名为正式名称"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={handleRemove}
                className="p-2 rounded-lg text-brick-500 hover:bg-brick-500/10 transition-colors"
                title="撤下档案（记忆退回未归类）"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* 改名撞名冲突说明 */}
      {conflict && (
        <div className="mt-3 rounded-xl border border-brick-400/40 bg-brick-500/10 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-brick-500 mt-0.5 shrink-0" />
            <div className="text-sm text-ink-800">
              已经存在一份名为「{conflict.name}」的档案。改名未执行，旗下记忆仍归属
              「{archive.name}」，没有被移动。
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <button
              onClick={handleMerge}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-ochre-500 hover:bg-ochre-600 text-paper-50 transition-colors"
            >
              <GitMerge className="w-3.5 h-3.5" />
              与「{conflict.name}」合并
            </button>
            <button
              onClick={() => setConflict(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-ink-700/70 hover:bg-paper-200 transition-colors"
            >
              保持现状
            </button>
          </div>
        </div>
      )}

      {/* 派生统计 */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat
          icon={<Layers className="w-3.5 h-3.5" />}
          label="记忆数量"
          value={String(stats.count)}
          tone="ochre"
        />
        <Stat
          icon={<Gauge className="w-3.5 h-3.5" />}
          label="平均强度"
          value={stats.count ? stats.avgIntensity.toFixed(1) : '—'}
          tone="moss"
        />
        <Stat
          icon={<Clock className="w-3.5 h-3.5" />}
          label="最近封存"
          value={stats.latestSealedAt ? formatDate(stats.latestSealedAt).slice(5, 10) : '—'}
          title={stats.latestSealedAt ? formatDate(stats.latestSealedAt) : undefined}
          tone="lavender"
        />
      </div>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-4 self-start text-xs text-ochre-600 hover:text-ochre-700 font-medium"
      >
        {expanded ? '收起旗下记忆' : `查看旗下 ${members.length} 段记忆`}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {members.length === 0 ? (
            <p className="text-xs text-ink-700/50 py-2">暂无旗下记忆</p>
          ) : (
            members.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-2 rounded-xl bg-paper-100/70 border border-paper-200 px-3 py-2"
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: m.color_association }}
                />
                <span className="text-sm text-ink-800 truncate flex-1" title={m.memory_text}>
                  {m.source_guess || m.location}
                </span>
                <span className="text-xs font-semibold text-ochre-600 shrink-0">{m.intensity}/10</span>
                <select
                  value={m.locationId ?? ''}
                  onChange={(e) => onMoveMemory(m.id, e.target.value || null)}
                  className="scent-select text-xs py-1 pl-2 pr-7 w-auto max-w-[9rem] cursor-pointer"
                  title="把这段记忆换到别处"
                >
                  <option value="">未归类</option>
                  {allLocations.map((a) => (
                    <option key={a.id} value={a.id} className="bg-paper-50 text-ink-800">
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            ))
          )}
          {otherLocations.length === 0 && (
            <p className="text-[11px] text-ink-700/45 pt-1">目前只有这一份档案，暂无可并入的其它档案。</p>
          )}
        </div>
      )}
    </article>
  );
}

function Stat({
  icon,
  label,
  value,
  title,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  title?: string;
  tone: 'ochre' | 'moss' | 'lavender';
}) {
  const tones = {
    ochre: 'bg-ochre-100/70 text-ochre-600',
    moss: 'bg-moss-100/70 text-moss-600',
    lavender: 'bg-lavender-300/30 text-lavender-600',
  } as const;
  return (
    <div className="rounded-xl bg-paper-100/60 border border-paper-200 p-2.5" title={title}>
      <div className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${tones[tone]}`}>
        {icon}
        {label}
      </div>
      <div className="mt-1.5 font-serif text-lg font-bold text-ink-800 leading-none truncate" title={title ?? value}>
        {value}
      </div>
    </div>
  );
}

/* ---------------- 未归类记忆面板 ---------------- */

function UnclassifiedPanel({
  memories,
  allLocations,
  onMoveMemory,
}: {
  memories: SmellMemory[];
  allLocations: LocationArchive[];
  onMoveMemory: (memoryId: string, targetId: string | null) => void;
}) {
  return (
    <section className="mt-8">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-9 h-9 rounded-xl bg-paper-200 text-ink-700/70 flex items-center justify-center">
          <Inbox className="w-5 h-5" />
        </span>
        <h2 className="font-serif text-2xl font-semibold text-ink-800">未归类</h2>
        <span className="text-sm text-ink-700/50">
          · {memories.length} 段记忆还没有正式地点（档案被撤下后会回到这里）
        </span>
      </div>

      {memories.length === 0 ? (
        <div className="bg-paper-50/60 rounded-2xl border-2 border-dashed border-paper-400 py-10 text-center text-ink-700/50 text-sm">
          所有记忆都已归入正式地点档案 🍃
        </div>
      ) : (
        <div className="bg-paper-50/80 rounded-2xl border border-paper-300 shadow-card divide-y divide-paper-200 overflow-hidden">
          {memories.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: m.color_association }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-ink-800 truncate">
                  {m.location || '（未命名地点）'}
                </div>
                <div className="text-xs text-ink-700/55 truncate">
                  {m.source_guess || m.memory_text}
                </div>
              </div>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) onMoveMemory(m.id, e.target.value);
                }}
                className="scent-select text-xs py-1.5 pl-3 pr-8 w-auto cursor-pointer shrink-0"
              >
                <option value="">归入档案…</option>
                {allLocations.map((a) => (
                  <option key={a.id} value={a.id} className="bg-paper-50 text-ink-800">
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
