import type { SmellMemory, LocationArchive } from '../../utils/constants';
import { getSmellTypeInfo } from '../../utils/constants';
import { formatDate } from '../../utils/helpers';
import { FolderInput } from 'lucide-react';

interface Props {
  memory: SmellMemory;
  locations: LocationArchive[];
  onMove: (targetId: string | null) => void;
}

/** 档案内的单条记忆：可把它换到别处（含退回未归类） */
export default function MemoryMoveRow({ memory, locations, onMove }: Props) {
  const stype = getSmellTypeInfo(memory.smell_type);

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-paper-50/80 border border-paper-200">
      <span
        className="w-2 h-8 rounded-full shrink-0"
        style={{ backgroundColor: memory.color_association }}
        title={`颜色联想: ${memory.color_association}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: stype.color }}>{stype.emoji}</span>
          <p className="text-sm font-medium text-ink-800 truncate">{memory.source_guess || '未填写来源'}</p>
          <span className="shrink-0 text-xs font-semibold text-ochre-600">强度 {memory.intensity}</span>
        </div>
        <p className="text-[11px] text-ink-700/50 mt-0.5 truncate font-serif">
          {memory.memory_text || '（没有关联记忆文字）'} · 封存于 {formatDate(memory.created_at)}
        </p>
      </div>
      <div className="relative shrink-0">
        <FolderInput className="w-3.5 h-3.5 text-ochre-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <select
          aria-label="转移到其他地点档案"
          value={memory.location_id ?? ''}
          onChange={(e) => onMove(e.target.value || null)}
          className="appearance-none pl-8 pr-7 py-1.5 rounded-lg text-xs bg-paper-100 border border-paper-300 text-ink-700 hover:border-ochre-400 focus:outline-none focus:ring-2 focus:ring-ochre-300 cursor-pointer max-w-[9.5rem]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238B5A2B' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 8px center',
          }}
        >
          <option value="">📦 未归类</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name.length > 8 ? `${l.name.slice(0, 8)}…` : l.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
