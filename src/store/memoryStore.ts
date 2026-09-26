import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SmellMemory, LocationArchive, Season, SmellType, Emotion } from '../utils/constants';
import { generateId, normalizeLocationName } from '../utils/helpers';
import { mockMemories, mockLocations } from '../data/mockData';

export interface MemoryInput {
  location: string;
  source_guess: string;
  intensity: number;
  humidity: number;
  season: Season;
  smell_type: SmellType;
  memory_text: string;
  color_association: string;
  emotion: Emotion;
  want_again: boolean;
}

/** 改名结果：撞上已有档案时返回冲突，原归属保持不变 */
export interface RenameResult {
  ok: boolean;
  conflictWith?: string;
  conflictCount?: number;
}

interface MemoryStore {
  memories: SmellMemory[];
  locations: LocationArchive[];
  addMemory: (input: MemoryInput) => void;
  updateMemory: (id: string, input: MemoryInput) => void;
  deleteMemory: (id: string) => void;
  /** 新建一份地点档案；名称为空或与已有档案重名时返回 null */
  createLocation: (name: string) => LocationArchive | null;
  /** 改名；若新名字撞上别的档案，拒绝并保留原来的归属 */
  renameLocation: (id: string, name: string) => RenameResult;
  /** 撤下档案：旗下记忆只解除归属（退回未归类），记忆本身保留 */
  removeLocation: (id: string) => void;
  /** 把记忆移到别处：targetId 为 null 表示移回未归类 */
  moveMemory: (memoryId: string, targetId: string | null) => void;
  initIfEmpty: () => void;
}

/** 按标准化后的名字查找档案（排除指定档案自身） */
function findByName(locations: LocationArchive[], name: string, excludeId?: string) {
  const target = normalizeLocationName(name);
  return locations.find((l) => l.id !== excludeId && l.name === target);
}

/** 为记忆文本中的地点解析归属：已有同名档案则并入，否则新建一份 */
function resolveLocation(
  locations: LocationArchive[],
  rawName: string,
): { locations: LocationArchive[]; location: LocationArchive } {
  const name = normalizeLocationName(rawName);
  const existing = locations.find((l) => l.name === name);
  if (existing) return { locations, location: existing };
  const created: LocationArchive = {
    id: generateId(),
    name,
    created_at: new Date().toISOString(),
  };
  return { locations: [...locations, created], location: created };
}

export const useMemoryStore = create<MemoryStore>()(
  persist(
    (set, get) => ({
      memories: [],
      locations: [],

      addMemory: (input) => {
        const now = new Date().toISOString();
        const resolved = resolveLocation(get().locations, input.location);
        const newMem: SmellMemory = {
          id: generateId(),
          ...input,
          location: resolved.location.name,
          location_id: resolved.location.id,
          created_at: now,
          updated_at: now,
        };
        set({
          memories: [newMem, ...get().memories],
          locations: resolved.locations,
        });
      },

      updateMemory: (id, input) => {
        const target = get().memories.find((m) => m.id === id);
        const name = normalizeLocationName(input.location);
        let nextLocations = get().locations;
        let locationId = target?.location_id ?? null;
        // 只有地点文本真的变了才重新解析归属；
        // 文本没变时原归属保持原样（未归类的记忆改其他字段不会因此复活旧档案）
        const locationChanged = !target || target.location !== name;
        if (locationChanged) {
          const resolved = resolveLocation(nextLocations, name);
          nextLocations = resolved.locations;
          locationId = resolved.location.id;
        }
        set({
          locations: nextLocations,
          memories: get().memories.map((m) =>
            m.id === id
              ? { ...m, ...input, location: name, location_id: locationId, updated_at: new Date().toISOString() }
              : m,
          ),
        });
      },

      deleteMemory: (id) => {
        set({ memories: get().memories.filter((m) => m.id !== id) });
      },

      createLocation: (rawName) => {
        const name = normalizeLocationName(rawName);
        if (!name) return null;
        if (findByName(get().locations, name)) return null;
        const loc: LocationArchive = {
          id: generateId(),
          name,
          created_at: new Date().toISOString(),
        };
        set({ locations: [...get().locations, loc] });
        return loc;
      },

      renameLocation: (id, rawName) => {
        const name = normalizeLocationName(rawName);
        const current = get().locations.find((l) => l.id === id);
        if (!current || !name) return { ok: false };
        if (name === current.name) return { ok: true };
        const conflict = findByName(get().locations, name, id);
        if (conflict) {
          // 已有同名正式档案：保留原来的归属，不做任何改动
          return {
            ok: false,
            conflictWith: conflict.name,
            conflictCount: get().memories.filter((m) => m.location_id === conflict.id).length,
          };
        }
        set({
          locations: get().locations.map((l) => (l.id === id ? { ...l, name } : l)),
          // 同步旗下记忆里显示的地点名，归属不变
          memories: get().memories.map((m) =>
            m.location_id === id ? { ...m, location: name } : m,
          ),
        });
        return { ok: true };
      },

      removeLocation: (id) => {
        // 撤下档案 ≠ 删除记忆：旗下记忆退回未归类，记忆一条都不会丢
        set({
          locations: get().locations.filter((l) => l.id !== id),
          memories: get().memories.map((m) =>
            m.location_id === id ? { ...m, location_id: null } : m,
          ),
        });
      },

      moveMemory: (memoryId, targetId) => {
        const mem = get().memories.find((m) => m.id === memoryId);
        if (!mem || mem.location_id === targetId) return;
        if (targetId !== null && !get().locations.some((l) => l.id === targetId)) return;
        const target = targetId
          ? get().locations.find((l) => l.id === targetId)
          : null;
        set({
          memories: get().memories.map((m) =>
            m.id === memoryId
              ? {
                  ...m,
                  location_id: targetId,
                  // 移入档案后显示正式名称；移回未归类则保留它最后所属档案的名字
                  ...(target ? { location: target.name } : {}),
                }
              : m,
          ),
        });
      },

      initIfEmpty: () => {
        if (get().memories.length === 0 && get().locations.length === 0) {
          set({ memories: mockMemories, locations: mockLocations });
        }
      },
    }),
    {
      name: 'scent-memory-storage',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // 旧版本（地点只是自由文本）迁移：按标准化后的地点名自动归到唯一的正式档案
      migrate: (persisted: unknown) => {
        const state = (persisted ?? {}) as Partial<MemoryStore>;
        const memories = (state.memories ?? []) as SmellMemory[];
        if (state.locations) return state as MemoryStore;
        const byName = new Map<string, LocationArchive>();
        const migrated: SmellMemory[] = memories.map((m) => {
          const name = normalizeLocationName(String(m.location ?? ''));
          let loc = byName.get(name);
          if (!loc) {
            loc = { id: generateId(), name, created_at: new Date().toISOString() };
            byName.set(name, loc);
          }
          return { ...m, location: name, location_id: loc.id };
        });
        return { ...state, memories: migrated, locations: [...byName.values()] };
      },
    },
  ),
);
