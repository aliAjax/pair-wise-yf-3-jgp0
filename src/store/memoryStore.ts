import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SmellMemory, Season, SmellType, Emotion, LocationArchive } from '../utils/constants';
import { generateId, normalizeLocationName, migrateMemoriesToArchives } from '../utils/helpers';
import { mockMemories, mockLocationArchives } from '../data/mockData';

export interface MemoryInput {
  location: string;
  locationId: string | null;
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

/** 改名 / 合并 / 移动等档案操作的结果，用于在界面上说明冲突 */
export type ArchiveOpResult =
  | { status: 'ok' }
  | { status: 'conflict'; conflictId: string; conflictName: string }
  | { status: 'empty' }
  | { status: 'not-found' };

interface MemoryStore {
  memories: SmellMemory[];
  locations: LocationArchive[];
  addMemory: (input: MemoryInput) => void;
  updateMemory: (id: string, input: MemoryInput) => void;
  deleteMemory: (id: string) => void;
  /** 把记忆归入某档案（targetId 为 null 时退回未归类），数字立即重算 */
  moveMemory: (memoryId: string, targetId: string | null) => void;

  renameLocation: (id: string, newName: string) => ArchiveOpResult;
  /** 把 source 旗下记忆并入 target，再撤下 source；撞自己时安全返回 */
  mergeLocation: (sourceId: string, targetId: string) => ArchiveOpResult;
  /** 撤下档案：旗下记忆退回未归类，记忆本身一律保留 */
  removeLocation: (id: string) => void;
  /** 把若干未归类记忆一次性归入某档案 */
  assignUnclassified: (memoryIds: string[], targetId: string) => ArchiveOpResult;

  initIfEmpty: () => void;
}

export const useMemoryStore = create<MemoryStore>()(
  persist(
    (set, get) => ({
      memories: [],
      locations: [],

      addMemory: (input) => {
        const state = get();
        const name = normalizeLocationName(input.location);

        // 确定归属档案：优先用显式选择的档案；否则按正式名称查找；再没有才新建。
        // 保证同一个正式名称永远只对应一份档案。
        let archive =
          (input.locationId && state.locations.find((a) => a.id === input.locationId)) ||
          (name ? state.locations.find((a) => a.name === name) : undefined);

        let locations = state.locations;
        if (!archive && name) {
          archive = { id: generateId(), name, created_at: new Date().toISOString() };
          locations = [...locations, archive];
        }

        const now = new Date().toISOString();
        const newMem: SmellMemory = {
          id: generateId(),
          ...input,
          location: archive ? archive.name : name,
          locationId: archive ? archive.id : null,
          created_at: now,
          updated_at: now,
        };
        set({ memories: [newMem, ...state.memories], locations });
      },

      updateMemory: (id, input) => {
        const state = get();
        set({
          memories: state.memories.map((m) => {
            if (m.id !== id) return m;
            // 归属由 locationId 决定；若换了档案，地名快照同步为目标档案的正式名称
            const target =
              input.locationId != null
                ? state.locations.find((a) => a.id === input.locationId)
                : undefined;
            return {
              ...m,
              ...input,
              location: target ? target.name : normalizeLocationName(input.location) || m.location,
              locationId: target ? target.id : null,
              updated_at: new Date().toISOString(),
            };
          }),
        });
      },

      deleteMemory: (id) => {
        set({ memories: get().memories.filter((m) => m.id !== id) });
      },

      moveMemory: (memoryId, targetId) => {
        const state = get();
        const target =
          targetId != null ? state.locations.find((a) => a.id === targetId) : undefined;
        if (targetId != null && !target) return;
        set({
          memories: state.memories.map((m) =>
            m.id === memoryId
              ? {
                  ...m,
                  locationId: target ? target.id : null,
                  location: target ? target.name : m.location,
                  updated_at: new Date().toISOString(),
                }
              : m,
          ),
        });
      },

      renameLocation: (id, newName) => {
        const name = normalizeLocationName(newName);
        if (!name) return { status: 'empty' };
        const state = get();
        const target = state.locations.find((a) => a.id === id);
        if (!target) return { status: 'not-found' };

        // 撞上已有档案：保留原来的归属，一处都不改，把冲突交给调用方说明
        const clash = state.locations.find((a) => a.id !== id && a.name === name);
        if (clash) {
          return { status: 'conflict', conflictId: clash.id, conflictName: clash.name };
        }

        set({
          locations: state.locations.map((a) => (a.id === id ? { ...a, name } : a)),
          // 同步旗下记忆的地名快照，归属（locationId）保持不变
          memories: state.memories.map((m) =>
            m.locationId === id ? { ...m, location: name } : m,
          ),
        });
        return { status: 'ok' };
      },

      mergeLocation: (sourceId, targetId) => {
        if (sourceId === targetId) return { status: 'not-found' };
        const state = get();
        const target = state.locations.find((a) => a.id === targetId);
        const source = state.locations.find((a) => a.id === sourceId);
        if (!target || !source) return { status: 'not-found' };

        set({
          // source 旗下记忆连同正式名称一起并入 target
          memories: state.memories.map((m) =>
            m.locationId === sourceId
              ? { ...m, locationId: targetId, location: target.name }
              : m,
          ),
          // source 档案撤下，target 保留为唯一正式档案
          locations: state.locations.filter((a) => a.id !== sourceId),
        });
        return { status: 'ok' };
      },

      removeLocation: (id) => {
        const state = get();
        if (!state.locations.some((a) => a.id === id)) return;
        set({
          // 关键：只断开归属（退回未归类），记忆一条都不删除
          memories: state.memories.map((m) =>
            m.locationId === id ? { ...m, locationId: null } : m,
          ),
          locations: state.locations.filter((a) => a.id !== id),
        });
      },

      assignUnclassified: (memoryIds, targetId) => {
        const state = get();
        const target = state.locations.find((a) => a.id === targetId);
        if (!target) return { status: 'not-found' };
        const ids = new Set(memoryIds);
        set({
          memories: state.memories.map((m) =>
            ids.has(m.id)
              ? { ...m, locationId: targetId, location: target.name }
              : m,
          ),
        });
        return { status: 'ok' };
      },

      initIfEmpty: () => {
        if (get().memories.length === 0 && get().locations.length === 0) {
          set({ memories: mockMemories, locations: mockLocationArchives });
        }
      },
    }),
    {
      name: 'scent-memory-storage',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      // 旧版本只有记忆、没有档案：按地名各自生成唯一正式档案完成迁移
      migrate: (persistedState: unknown, version: number) => {
        const s = persistedState as {
          memories?: SmellMemory[];
          locations?: LocationArchive[];
        };
        if (version < 2 && s && Array.isArray(s.memories)) {
          const { memories, archives } = migrateMemoriesToArchives(s.memories);
          return { ...s, memories, locations: s.locations ?? archives };
        }
        return s as MemoryStore;
      },
    },
  ),
);
