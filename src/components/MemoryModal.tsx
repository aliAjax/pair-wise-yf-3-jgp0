import { useEffect, useRef, useState } from 'react';
import { X, MapPin, PlusCircle } from 'lucide-react';
import type { SmellMemory, Season, SmellType, Emotion, LocationArchive } from '../utils/constants';
import { SEASONS, SMELL_TYPES, EMOTIONS } from '../utils/constants';
import type { MemoryInput } from '../store/memoryStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MemoryInput) => void;
  editingData: SmellMemory | null;
  locations: LocationArchive[];
}

const NEW_ARCHIVE = '__new__';

const defaultForm: MemoryInput = {
  location: '',
  locationId: null,
  source_guess: '',
  intensity: 5,
  humidity: 5,
  season: 'autumn',
  smell_type: 'woody',
  memory_text: '',
  color_association: '#8B5A2B',
  emotion: 'nostalgic',
  want_again: true,
};

const intensityTicks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const humidityTicks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function MemoryModal({ isOpen, onClose, onSubmit, editingData, locations }: Props) {
  const [form, setForm] = useState<MemoryInput>(defaultForm);
  /** NEW_ARCHIVE 表示新建一个正式地点；否则为所选档案 id */
  const [archiveChoice, setArchiveChoice] = useState<string>(NEW_ARCHIVE);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (editingData) {
        const { id, created_at, updated_at, ...rest } = editingData;
        void id; void created_at; void updated_at;
        setForm({ ...rest, locationId: rest.locationId ?? null });
        setArchiveChoice(rest.locationId ?? NEW_ARCHIVE);
      } else {
        setForm(defaultForm);
        setArchiveChoice(NEW_ARCHIVE);
      }
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, editingData]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const update = <K extends keyof MemoryInput>(key: K, value: MemoryInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleArchiveChoice = (choice: string) => {
    setArchiveChoice(choice);
    if (choice === NEW_ARCHIVE) {
      // 新建：清空所选档案，等待输入正式名称
      update('locationId', null);
    } else {
      const target = locations.find((a) => a.id === choice);
      update('locationId', choice);
      if (target) update('location', target.name);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: MemoryInput = {
      ...form,
      // 选择已有档案时以档案 id 为准；新建时交给 store 建档
      locationId: archiveChoice === NEW_ARCHIVE ? null : form.locationId,
      location: form.location.trim(),
    };
    if (!payload.location) return;
    onSubmit(payload);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 pt-8 md:p-6 overflow-y-auto">
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: 'fadeIn 0.3s ease-out' }}
      />
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl bg-paper-50 rounded-3xl shadow-2xl border border-paper-300 animate-slideDown"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.54 0 0 0 0 0.35 0 0 0 0 0.18 0 0 0 0.04 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-paper-200 rounded-t-3xl bg-paper-50/95 backdrop-blur">
          <div>
            <h2 className="font-serif text-2xl font-bold text-ink-800">
              {editingData ? '编辑这段气味' : '封存一段新气味'}
            </h2>
            <p className="text-sm text-ink-700/60 mt-0.5 font-hand">
              {editingData ? '回忆已经变了吗？修改它吧～' : '把此刻空气中的味道记录下来'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-ink-700/60 hover:text-ink-800 hover:bg-paper-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-paper-200">
              <span className="w-1.5 h-6 bg-ochre-500 rounded-full" />
              <h3 className="font-hand text-xl text-ochre-600">基础信息</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-ink-700 mb-1.5">
                  地点档案 *
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative sm:w-56 shrink-0">
                    <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ochre-500 pointer-events-none" />
                    <select
                      value={archiveChoice}
                      onChange={(e) => handleArchiveChoice(e.target.value)}
                      className="scent-select pl-9 w-full cursor-pointer"
                    >
                      <option value={NEW_ARCHIVE}>＋ 新建地点档案</option>
                      {locations.map((a) => (
                        <option key={a.id} value={a.id} className="bg-paper-50 text-ink-800">
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    required
                    value={form.location}
                    onChange={(e) => update('location', e.target.value)}
                    disabled={archiveChoice !== NEW_ARCHIVE}
                    placeholder={
                      archiveChoice === NEW_ARCHIVE
                        ? '输入正式地点名称，例如：外婆家的老衣柜'
                        : '已归入上方所选档案'
                    }
                    className="scent-input flex-1 disabled:bg-paper-100 disabled:text-ink-700/60 disabled:cursor-not-allowed"
                  />
                </div>
                <p className="text-[11px] text-ink-700/50 mt-1.5 flex items-center gap-1">
                  <PlusCircle className="w-3 h-3" />
                  同一个地点请始终选择同一份档案，避免少写一个字就被拆成两处
                </p>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-ink-700 mb-1.5">气味来源猜测</label>
                <input
                  type="text"
                  value={form.source_guess}
                  onChange={(e) => update('source_guess', e.target.value)}
                  placeholder="例如：樟木 + 旧毛衣"
                  className="scent-input"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-paper-200">
              <span className="w-1.5 h-6 bg-moss-500 rounded-full" />
              <h3 className="font-hand text-xl text-moss-600">感官属性</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-ink-700">气味强度</label>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-ochre-100 text-ochre-600 font-semibold text-sm">
                    {form.intensity} / 10
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={form.intensity}
                  onChange={(e) => update('intensity', Number(e.target.value))}
                  className="scent-slider"
                />
                <div className="scent-slider-ticks">
                  {intensityTicks.map((v) => (
                    <span key={v} data-value={v} />
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-ink-700">湿度感</label>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-moss-100 text-moss-600 font-semibold text-sm">
                    {form.humidity <= 3 ? '极干' : form.humidity <= 6 ? '适中' : '极湿'}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={form.humidity}
                  onChange={(e) => update('humidity', Number(e.target.value))}
                  className="scent-slider"
                  style={{ background: 'linear-gradient(90deg, #E0D1B3 0%, #7DA08C 100%)' }}
                />
                <div className="scent-slider-ticks">
                  {humidityTicks.map((v) => (
                    <span key={v} data-value={v} />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">季节</label>
                <div className="grid grid-cols-4 gap-2">
                  {SEASONS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => update('season', s.value as Season)}
                      className={`py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex flex-col items-center gap-0.5 ${
                        form.season === s.value
                          ? 'bg-ochre-500 text-paper-50 shadow-paper scale-[1.02]'
                          : 'bg-paper-100 text-ink-700 hover:bg-paper-200 border border-paper-200'
                      }`}
                    >
                      <span className="text-lg leading-none">{s.emoji}</span>
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">颜色联想</label>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-paper-100 border border-paper-200">
                  <input
                    type="color"
                    value={form.color_association}
                    onChange={(e) => update('color_association', e.target.value)}
                    className="scent-color shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm text-ink-800 font-semibold">{form.color_association.toUpperCase()}</div>
                    <div className="text-xs text-ink-700/60 mt-0.5">想到这种味道时，脑中浮现的颜色</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-700 mb-2">气味类型</label>
              <div className="flex flex-wrap gap-2">
                {SMELL_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => update('smell_type', t.value as SmellType)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 inline-flex items-center gap-1.5 ${
                      form.smell_type === t.value
                        ? 'text-paper-50 shadow-paper scale-[1.03]'
                        : 'bg-paper-100 text-ink-700 hover:bg-paper-200 border border-paper-200'
                    }`}
                    style={form.smell_type === t.value ? { backgroundColor: t.color } : {}}
                  >
                    <span>{t.emoji}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-paper-200">
              <span className="w-1.5 h-6 bg-lavender-500 rounded-full" />
              <h3 className="font-hand text-xl text-lavender-600">情感记忆</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">关联记忆</label>
              <textarea
                value={form.memory_text}
                onChange={(e) => update('memory_text', e.target.value)}
                rows={4}
                placeholder="这种味道让你想起了什么人、什么事？尽情写下来吧..."
                className="scent-textarea font-serif"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-2">唤起的情绪</label>
                <div className="flex flex-wrap gap-1.5">
                  {EMOTIONS.map((e) => (
                    <button
                      key={e.value}
                      type="button"
                      onClick={() => update('emotion', e.value as Emotion)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 inline-flex items-center gap-1 ${
                        form.emotion === e.value
                          ? `${e.bg} ${e.text} ring-2 ring-offset-1 ring-offset-paper-50 ring-ochre-300 scale-[1.03]`
                          : 'bg-paper-100 text-ink-700/70 hover:bg-paper-200 border border-paper-200'
                      }`}
                    >
                      <span>{e.emoji}</span>
                      <span>{e.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-700 mb-2">还想再闻到吗？</label>
                <div
                  className="flex items-center gap-4 p-3 rounded-xl bg-paper-100 border border-paper-200 cursor-pointer select-none"
                  onClick={() => update('want_again', !form.want_again)}
                >
                  <div className={`toggle-switch ${form.want_again ? 'active' : ''}`} />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-ink-800">
                      {form.want_again ? '🌿 希望有机会再次闻到' : '😮‍💨 就让它留在记忆里吧'}
                    </div>
                    <div className="text-[11px] text-ink-700/55 mt-0.5">
                      {form.want_again ? '标记的气味会显示在卡片上' : '偶尔，不完美的回忆更珍贵'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-paper-200">
            <button type="button" onClick={onClose} className="btn-secondary">
              取消
            </button>
            <button type="submit" className="btn-primary">
              {editingData ? '保存修改' : '封存这段记忆'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
