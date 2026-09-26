import type { SmellMemory, LocationArchive } from './constants';

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

/**
 * 标准化地点名称：去掉首尾空白、把内部连续空白压成一个。
 * 多敲的空格不会再把同一个地点拆成两份档案（真正少写了字仍是不同名字，需要手动整理）。
 */
export function normalizeLocationName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
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

/** 相对时间：刚刚 / N 分钟前 / N 小时前 / N 天前 / N 个月前 / N 年前 */
export function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`;
  if (diff < 365 * day) return `${Math.floor(diff / (30 * day))} 个月前`;
  return `${Math.floor(diff / (365 * day))} 年前`;
}

export interface LocationStats {
  count: number;
  averageIntensity: number;
  /** 最近一次封存时间（取旗下记忆 created_at 的最大值） */
  latestSealedAt: string | null;
}

/** 档案统计全部从旗下记忆实时派生：记忆换到别处后数字立刻重算 */
export function getLocationStats(memories: SmellMemory[]): LocationStats {
  if (!memories.length) {
    return { count: 0, averageIntensity: 0, latestSealedAt: null };
  }
  return {
    count: memories.length,
    averageIntensity: getAverageIntensity(memories),
    latestSealedAt: memories.reduce(
      (max, m) => (m.created_at > max ? m.created_at : max),
      memories[0].created_at,
    ),
  };
}

/** 按记忆数降序、再按最近封存时间降序排列档案 */
export function sortLocations(
  locations: LocationArchive[],
  statsById: Map<string, LocationStats>,
): LocationArchive[] {
  return [...locations].sort((a, b) => {
    const sa = statsById.get(a.id);
    const sb = statsById.get(b.id);
    const diff = (sb?.count ?? 0) - (sa?.count ?? 0);
    if (diff !== 0) return diff;
    return (sb?.latestSealedAt ?? '').localeCompare(sa?.latestSealedAt ?? '');
  });
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
