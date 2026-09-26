import type { SmellMemory, LocationArchive } from './constants';

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

/** 地点名归一化：去掉首尾空白。同名（忽略首尾空白）视为同一个正式名称 */
export function normalizeLocationName(name: string): string {
  return name.trim();
}

/** 单个地点档案的派生统计：全部由旗下记忆实时算出，不做缓存，移动记忆后立即重算 */
export interface LocationStats {
  count: number;
  avgIntensity: number;
  /** 最近一次封存时间：旗下记忆里最新的 created_at */
  latestSealedAt: string | null;
}

export function emptyStats(): LocationStats {
  return { count: 0, avgIntensity: 0, latestSealedAt: null };
}

/** 按 locationId 聚合统计；key 为 null 时聚合所有未归类记忆 */
export function getLocationStatsMap(memories: SmellMemory[]): Map<string | null, LocationStats> {
  const map = new Map<string | null, { sum: number; count: number; latest: string | null }>();
  for (const m of memories) {
    const key = m.locationId;
    const acc = map.get(key) ?? { sum: 0, count: 0, latest: null };
    acc.sum += m.intensity;
    acc.count += 1;
    if (acc.latest === null || (m.created_at > acc.latest)) acc.latest = m.created_at;
    map.set(key, acc);
  }
  const result = new Map<string | null, LocationStats>();
  map.forEach((acc, key) => {
    result.set(key, {
      count: acc.count,
      avgIntensity: acc.count ? Math.round((acc.sum / acc.count) * 10) / 10 : 0,
      latestSealedAt: acc.latest,
    });
  });
  return result;
}

/** 未归类记忆的统计（locationId 为 null，或归属了一个已不存在的档案） */
export function getUnclassifiedMemories(
  memories: SmellMemory[],
  archives: LocationArchive[],
): SmellMemory[] {
  const liveIds = new Set(archives.map((a) => a.id));
  return memories.filter((m) => m.locationId === null || !liveIds.has(m.locationId));
}

/** 把旧的、仅有 location 文本的记忆迁移为正式档案（每个地名一份唯一档案） */
export function migrateMemoriesToArchives(memories: SmellMemory[]): {
  memories: SmellMemory[];
  archives: LocationArchive[];
} {
  const nameToId = new Map<string, string>();
  const archives: LocationArchive[] = [];
  const migrated = memories.map((m) => {
    const name = normalizeLocationName(m.location);
    if (!name) return { ...m, locationId: null };
    let id = nameToId.get(name);
    if (!id) {
      id = generateId();
      nameToId.set(name, id);
      archives.push({ id, name, created_at: m.created_at });
    }
    return { ...m, locationId: id };
  });
  return { memories: migrated, archives };
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}.${m}.${day} ${hh}:${mm}`;
}

export interface Filters {
  smellType: string;
  season: string;
  emotion: string;
}

export function filterMemories(memories: SmellMemory[], filters: Filters): SmellMemory[] {
  return memories.filter(m => {
    if (filters.smellType && m.smell_type !== filters.smellType) return false;
    if (filters.season && m.season !== filters.season) return false;
    if (filters.emotion && m.emotion !== filters.emotion) return false;
    return true;
  });
}

export interface IntensityDistribution {
  bucket: string;
  count: number;
  range: [number, number];
}

export function getIntensityDistribution(memories: SmellMemory[]): IntensityDistribution[] {
  const buckets = [
    { bucket: '1-2', range: [1, 2] as [number, number] },
    { bucket: '3-4', range: [3, 4] as [number, number] },
    { bucket: '5-6', range: [5, 6] as [number, number] },
    { bucket: '7-8', range: [7, 8] as [number, number] },
    { bucket: '9-10', range: [9, 10] as [number, number] },
  ];
  return buckets.map(b => ({
    ...b,
    count: memories.filter(m => m.intensity >= b.range[0] && m.intensity <= b.range[1]).length,
  }));
}

export function getAverageIntensity(memories: SmellMemory[]): number {
  if (!memories.length) return 0;
  const sum = memories.reduce((acc, m) => acc + m.intensity, 0);
  return Math.round((sum / memories.length) * 10) / 10;
}

export function getTopIntensityMemories(memories: SmellMemory[], n = 5): SmellMemory[] {
  return [...memories].sort((a, b) => b.intensity - a.intensity).slice(0, n);
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

export function isLightColor(hex: string): boolean {
  const { r, g, b } = hexToRgb(hex);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155;
}

export function contrastTextColor(hex: string): string {
  return isLightColor(hex) ? '#2A2118' : '#FBF7EE';
}
