import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPinned, Plus, PackageOpen } from 'lucide-react';
import Header from '../components/Header';
import LocationCard from '../components/locations/LocationCard';
import MemoryMoveRow from '../components/locations/MemoryMoveRow';
import { useMemoryStore } from '../store/memoryStore';
import { getLocationStats, sortLocations } from '../utils/helpers';

export default function Locations() {
  const navigate = useNavigate();
  const memories = useMemoryStore((s) => s.memories);
  const locations = useMemoryStore((s) => s.locations);
  const createLocation = useMemoryStore((s) => s.createLocation);
  const renameLocation = useMemoryStore((s) => s.renameLocation);
  const removeLocation = useMemoryStore((s) => s.removeLocation);
  const moveMemory = useMemoryStore((s) => s.moveMemory);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // 统计完全由记忆实时派生：移动记忆 / 撤下档案后立即重算；zustand persist 负责落盘，重开页面结果不变
  const memoriesByLocation = useMemo(() => {
    const map = new Map<string, typeof memories>();
    for (const m of memories) {
      if (m.location_id === null) continue;
      const list = map.get(m.location_id);
      if (list) list.push(m);
      else map.set(m.location_id, [m]);
    }
    return map;
  }, [memories]);

  const statsById = useMemo(
    () => new Map(locations.map((l) => [l.id, getLocationStats(memoriesByLocation.get(l.id) ?? [])])),
    [locations, memoriesByLocation],
  );

  const sortedLocations = useMemo(
    () => sortLocations(locations, statsById),
    [locations, statsById],
  );

  // 防御：归属指向已不存在的档案时，视为未归类
  const unclassified = useMemo(
    () => memories.filter((m) => m.location_id === null || !locations.some((l) => l.id === m.location_id)),
    [memories, locations],
  );

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  };

  const handleCreate = () => {
    const name = window.prompt('新地点档案的正式名称：');
    if (name === null) return;
    const created = createLocation(name);
    if (created) {
      setExpandedId(created.id);
      flash(`已建立档案「${created.name}」`);
    } else {
      flash('没有建立：名称为空，或已有同名档案');
    }
  };

  const handleRename = (id: string, name: string) => {
    const result = renameLocation(id, name);
    if (!result.ok) {
      flash(`改名失败：已存在「${result.conflictWith}」档案，原归属保留`);
    }
    return result;
  };

  const handleRemove = (id: string) => {
    const count = memoriesByLocation.get(id)?.length ?? 0;
    removeLocation(id);
    if (expandedId === id) setExpandedId(null);
    flash(count > 0 ? `档案已撤下，${count} 段记忆退回未归类` : '档案已撤下');
  };

  const handleMove = (memoryId: string, targetId: string | null) => {
    moveMemory(memoryId, targetId);
    const target = targetId ? locations.find((l) => l.id === targetId) : null;
    flash(target ? `已转入「${target.name}」` : '已移回未归类');
  };

  const openAdd = () => navigate('/', { state: { openAdd: true } });

  return (
    <div className="min-h-screen">
      <Header onAdd={openAdd} memoryCount={memories.length} />

      <main className="container max-w-6xl pb-20">
        <section className="mb-6 bg-paper-50/70 backdrop-blur rounded-2xl border border-paper-300 p-4 md:p-5 shadow-paper">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-moss-100 text-moss-600 flex items-center justify-center shrink-0 border border-moss-200">
                <MapPinned className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-hand text-2xl text-ochre-600">地点档案</h2>
                <p className="text-sm text-ink-700/60 mt-0.5">
                  每个地点只有唯一的正式名称，记忆自动并入同名档案；改名撞上已有档案时会保留原归属。
                </p>
              </div>
            </div>
            <button onClick={handleCreate} className="btn-primary whitespace-nowrap self-start sm:self-auto">
              <Plus className="w-4 h-4" /> 新建地点档案
            </button>
          </div>
        </section>

        {sortedLocations.length === 0 && unclassified.length === 0 ? (
          <div className="bg-paper-50/70 backdrop-blur rounded-3xl border-2 border-dashed border-paper-400 py-20 text-center">
            <div className="text-6xl mb-4 select-none">🗺️</div>
            <h3 className="font-serif text-2xl text-ink-800 mb-2">还没有任何地点档案</h3>
            <p className="text-ink-700/60 max-w-md mx-auto mb-6">
              封存气味时填写的地点会自动建成正式档案，也可以先手动建好档案
            </p>
            <button onClick={handleCreate} className="btn-primary">
              <Plus className="w-4 h-4" /> 建立第一份地点档案
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedLocations.map((loc) => (
                <LocationCard
                  key={loc.id}
                  location={loc}
                  memories={memoriesByLocation.get(loc.id) ?? []}
                  allLocations={locations}
                  isExpanded={expandedId === loc.id}
                  onToggle={() => setExpandedId(expandedId === loc.id ? null : loc.id)}
                  onRename={(name) => handleRename(loc.id, name)}
                  onRemove={() => handleRemove(loc.id)}
                  onMoveMemory={handleMove}
                />
              ))}
            </div>

            <section className="mt-8">
              <div className="flex items-center gap-2 mb-3">
                <PackageOpen className="w-5 h-5 text-ink-700/60" />
                <h3 className="font-hand text-xl text-ink-700/80">未归类的记忆</h3>
                <span className="text-xs text-ink-700/50">· {unclassified.length} 段</span>
              </div>
              {unclassified.length === 0 ? (
                <p className="text-sm text-ink-700/50 bg-paper-50/60 border border-dashed border-paper-300 rounded-xl px-4 py-6 text-center font-hand text-base">
                  所有记忆都已归到正式地点档案 🌿
                </p>
              ) : (
                <div className="space-y-2">
                  {unclassified.map((m) => (
                    <MemoryMoveRow
                      key={m.id}
                      memory={m}
                      locations={locations}
                      onMove={(targetId) => handleMove(m.id, targetId)}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <footer className="pb-10 pt-4 text-center text-xs text-ink-700/40 font-hand text-lg">
        <p>愿每一缕气味，都是打开旧时光的钥匙 · Scent Archive</p>
      </footer>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fadeInUp pointer-events-none">
          <div className="bg-ink-800/90 text-paper-50 text-sm px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur border border-ink-700 whitespace-nowrap">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
