import { useState, useEffect, useMemo } from 'react';
import './tracker.css';
import Icon from './icons';
import { Summary } from './summary';
import { Toolbar } from './toolbar';
import { Table } from './table';
import { Board } from './board';
import { Drawer } from './drawer';
import { Palette } from './palette';
import { TweaksPanel } from './tweaks';
import { loadAll, insertTask, updateTaskInDb, deleteTaskInDb, loadListsWithIds, type ListItem } from './api';
import { SettingsPanel } from './settings';
import {
  CLIENTS, TYPES, CLAUDE_ACCOUNTS, T, daysUntil,
  loadTaskFiles,
  type Task, type Lang, type Tweaks, type Filters,
} from './data';

const DEFAULT_TWEAKS: Tweaks = {
  accent: 'amber',
  density: 'comfortable',
  theme: 'light',
  layout: 'table',
  language: 'en',
};

function Sidebar({
  lang,
  tasks,
  filters,
  setFilters,
}: {
  lang: Lang;
  tasks: Task[];
  filters: Filters;
  setFilters: (f: Filters) => void;
}) {
  const t = T[lang];
  const counts = {
    all:    tasks.length,
    active: tasks.filter(x => x.status === 'new' || x.status === 'progress').length,
    week:   tasks.filter(x => {
      const d = daysUntil(x.deadline);
      return x.status !== 'done' && x.status !== 'cancel' && d >= 0 && d <= 7;
    }).length,
    overdue: tasks.filter(x => x.status !== 'done' && x.status !== 'cancel' && daysUntil(x.deadline) < 0).length,
    done:   tasks.filter(x => x.status === 'done').length,
    cancel: tasks.filter(x => x.status === 'cancel').length,
    hi:     tasks.filter(x => x.priority === 'hi' && x.status !== 'done' && x.status !== 'cancel').length,
    unpaid: tasks.filter(x => x.status !== 'cancel' && (x.payment === 'unpaid' || x.payment === 'half')).length,
  };

  const isActive = (match: Filters) => JSON.stringify(match) === JSON.stringify(filters);

  const sections = [
    {
      group: t.views,
      items: [
        { label: t.all,       icon: 'inbox',    count: counts.all,    match: { status: '', priority: '', payment: '', quick: '' } },
        { label: t.active,    icon: 'clock',    count: counts.active, match: { status: '', priority: '', payment: '', quick: 'active' } },
        { label: t.this_week, icon: 'calendar', count: counts.week,   match: { status: '', priority: '', payment: '', quick: 'week' } },
        { label: t.overdue,   icon: 'flame',    count: counts.overdue,match: { status: '', priority: '', payment: '', quick: 'overdue' } },
        { label: t.completed, icon: 'check',    count: counts.done,   match: { status: 'done', priority: '', payment: '', quick: '' } },
      ],
    },
    {
      group: t.filters,
      items: [
        { label: t.hi_pri, icon: 'pin',  count: counts.hi,     match: { status: '', priority: 'hi', payment: '', quick: 'active' } },
        { label: t.unpaid, icon: 'coin', count: counts.unpaid, match: { status: '', priority: '', payment: 'unpaid', quick: '' } },
      ],
    },
  ];

  return (
    <aside className="side">
      <div className="brand">
        <div className="brand__mark">T</div>
        <div>
          <div className="brand__title">{t.brand}</div>
          <div className="brand__sub">{t.brand_sub}</div>
        </div>
      </div>

      {sections.map(sec => (
        <div className="side__section" key={sec.group}>
          <div className="side__label">{sec.group}</div>
          {sec.items.map(it => (
            <div
              key={it.label}
              className={`side__item ${isActive(it.match) ? 'is-active' : ''}`}
              onClick={() => setFilters(it.match)}
            >
              <Icon name={it.icon} size={14} />
              <span>{it.label}</span>
              <span className="count mono">{it.count}</span>
            </div>
          ))}
        </div>
      ))}

      <div className="side__section">
        <div className="side__label">{t.by_client}</div>
        {CLIENTS.slice(0, 5).map(c => {
          const n = tasks.filter(x => x.client === c.name).length;
          if (!n) return null;
          return (
            <div key={c.name} className="side__item">
              <Icon name="user" size={14} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
              <span className="count mono">{n}</span>
            </div>
          );
        })}
      </div>

      <div className="side__foot">
        <div className="avatar">D</div>
        <div className="who">
          <b>Dawood</b>
          <span>engdawood.com</span>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ lang, tasks, onRefresh, refreshing }: { lang: Lang; tasks: Task[]; onRefresh: () => void; refreshing: boolean }) {
  const t = T[lang];
  return (
    <header className="topbar">
      <div className="topbar__row">
        <div className="crumbs">
          <h1>{t.title}</h1>
          <span className="crumbs__tag">
            <span className="mono">{tasks.length}</span> tasks
          </span>
        </div>
        <div className="topbar__actions">
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)',
            padding: '4px 8px', border: '1px solid var(--line)', borderRadius: 5,
            background: 'var(--surface)',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ok)', boxShadow: '0 0 0 3px var(--ok-soft)' }} />
            LIVE
          </span>
          <button
            className="btn btn--ghost"
            title="Refresh"
            onClick={onRefresh}
            disabled={refreshing}
            style={{ opacity: refreshing ? 0.5 : 1 }}
          >
            <Icon name="refresh" size={13} />
          </button>
          <button className="btn btn--ghost" title="Notifications">
            <Icon name="bell" size={13} />
          </button>
        </div>
      </div>
    </header>
  );
}

export default function TrackerApp() {
  const [tweak, setTweak] = useState<Tweaks>(DEFAULT_TWEAKS);
  const [tweakOpen, setTweakOpen] = useState(false);
  const [lang, setLang] = useState<Lang>('en');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [listItems, setListItems] = useState<ListItem[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>({ status: '', priority: '', payment: '', quick: '' });
  const [sortKey, setSortKey] = useState('deadline');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [openId, setOpenId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  async function refresh(initial = false) {
    initial ? setLoading(true) : setRefreshing(true);
    try {
      const [tasks, items] = await Promise.all([
        loadAll(),
        loadListsWithIds().catch(() => [] as ListItem[]),
      ]);
      setTasks(tasks);
      if (items.length) setListItems(items);
    } catch (e) {
      console.error('[Tracker] load failed:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { refresh(true); }, []);

  const claudeAccounts = useMemo(() => {
    const vals = listItems.filter(x => x.list_key === 'claude_accounts').map(x => x.value);
    return vals.length ? vals : CLAUDE_ACCOUNTS;
  }, [listItems]);

  const taskTypes = useMemo(() => {
    const vals = listItems.filter(x => x.list_key === 'task_types').map(x => x.value);
    return vals.length ? vals : TYPES;
  }, [listItems]);

  // Apply data-* attrs to html element
  useEffect(() => {
    document.documentElement.setAttribute('data-accent', tweak.accent);
    document.documentElement.setAttribute('data-density', tweak.density);
    document.documentElement.setAttribute('data-theme', tweak.theme);
    document.documentElement.setAttribute('lang', lang === 'ar' ? 'ar' : 'en');
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  }, [tweak, lang]);

  // ⌘K shortcut
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(o => !o);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  function updateTweak(p: Partial<Tweaks>) {
    setTweak(prev => ({ ...prev, ...p }));
    if (p.language) setLang(p.language);
  }

  function updateTask(id: number, patch: Partial<Task>) {
    setTasks(ts => ts.map(t => t.id === id ? { ...t, ...patch } : t));
    updateTaskInDb(id, patch).catch(console.error);
  }

  function deleteTask(id: number) {
    setTasks(ts => ts.filter(t => t.id !== id));
    deleteTaskInDb(id).catch(console.error);
  }

  async function newTask() {
    const blank: Task = {
      id: 0, client: '', university: '', course: '',
      title_en: 'Untitled task', title_ar: 'مهمة جديدة',
      type: 'Assignment', type_ar: 'واجب',
      deadline: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      priority: 'med', status: 'new',
      price: 0, payment: 'unpaid', claude: 'Pro',
      fatora: 'unknown', fatora_link: null,
      notes: '', instructions: '',
      log: [{ when: 'now', who: 'Dawood', what: 'Created task' }],
    };
    const dbId = await insertTask(blank);
    const withId = { ...blank, id: dbId };
    setTasks(prev => [withId, ...prev]);
    setOpenId(dbId);
  }

  const filtered = useMemo(() => {
    let r = tasks;
    if (filters.status)   r = r.filter(t => t.status === filters.status);
    if (filters.priority) r = r.filter(t => t.priority === filters.priority);
    if (filters.payment)  r = r.filter(t => t.payment === filters.payment);
    if (filters.quick === 'active')  r = r.filter(t => t.status === 'new' || t.status === 'progress');
    if (filters.quick === 'week')    r = r.filter(t => {
      const d = daysUntil(t.deadline);
      return t.status !== 'done' && t.status !== 'cancel' && d >= 0 && d <= 7;
    });
    if (filters.quick === 'overdue') r = r.filter(t => t.status !== 'done' && t.status !== 'cancel' && daysUntil(t.deadline) < 0);
    if (query.trim()) {
      const q = query.toLowerCase();
      r = r.filter(t =>
        (t.title_en + t.title_ar + t.client + t.university + t.course + t.type).toLowerCase().includes(q)
      );
    }
    r = [...r].sort((a, b) => {
      const k = sortKey === 'title' ? 'title_en' : sortKey as keyof Task;
      const A = a[k] as string | number;
      const B = b[k] as string | number;
      let cmp = 0;
      if (k === 'price' || k === 'id') cmp = (A as number) - (B as number);
      else if (k === 'priority') cmp = ({ hi: 0, med: 1, lo: 2 } as Record<string, number>)[String(A)] - ({ hi: 0, med: 1, lo: 2 } as Record<string, number>)[String(B)];
      else if (k === 'status')   cmp = ({ new: 0, progress: 1, done: 2, cancel: 3 } as Record<string, number>)[String(A)] - ({ new: 0, progress: 1, done: 2, cancel: 3 } as Record<string, number>)[String(B)];
      else cmp = String(A).localeCompare(String(B));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return r;
  }, [tasks, filters, query, sortKey, sortDir]);

  function onSort(k: string) {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('asc'); }
  }

  async function exportTasks(format: 'csv' | 'json') {
    const today = new Date().toISOString().slice(0, 10);
    const data = filtered;

    const fileResults = await Promise.all(
      data.map(t => loadTaskFiles(t.id).catch(() => [] as Awaited<ReturnType<typeof loadTaskFiles>>))
    );
    const dataWithFiles = data.map((t, i) => ({
      ...t,
      files: fileResults[i].map(f => ({ name: f.name, size: f.size, url: f.url })),
    }));

    let blob: Blob;
    let filename: string;

    if (format === 'json') {
      blob = new Blob([JSON.stringify(dataWithFiles, null, 2)], { type: 'application/json' });
      filename = `tracker-${today}.json`;
    } else {
      const cols = ['id','client','university','course','title_en','title_ar','type','type_ar','deadline','priority','status','price','payment','claude','fatora','fatora_link','notes','instructions','created_at','updated_at','files'] as const;
      const escape = (v: unknown) => {
        if (v === null || v === undefined) return '';
        const s = Array.isArray(v) ? v.map((f: { url: string }) => f.url).join(' | ') : String(v);
        return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const rows = dataWithFiles.map(t => cols.map(c => escape((t as Record<string, unknown>)[c])).join(','));
      const csv = [cols.join(','), ...rows].join('\n');
      blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      filename = `tracker-${today}.csv`;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const overdueCount = tasks.filter(x => x.status !== 'done' && x.status !== 'cancel' && daysUntil(x.deadline) < 0).length;
  const openTask = tasks.find(t => t.id === openId);
  const t = T[lang];

  return (
    <div className="app">
      <Sidebar lang={lang} tasks={tasks} filters={filters} setFilters={setFilters} />
      <Topbar lang={lang} tasks={filtered} onRefresh={() => refresh()} refreshing={refreshing} />

      <main className="main">
        <Summary tasks={tasks} lang={lang} />

        {!bannerDismissed && overdueCount > 0 && (
          <div className="banner">
            <span style={{ display: 'inline-flex', color: 'var(--acc)' }}><Icon name="flame" size={14} /></span>
            <span><b>{overdueCount} overdue</b> · 4 due in the next 48 hours. Stay sharp.</span>
            <span className="spacer" />
            <button
              className="btn btn--ghost"
              onClick={() => setFilters({ status: '', priority: '', payment: '', quick: 'overdue' })}
              style={{ color: 'var(--acc)' }}
            >
              {t.review} <Icon name="arrowR" size={12} />
            </button>
            <button className="banner__close" onClick={() => setBannerDismissed(true)}>
              <Icon name="x" size={12} />
            </button>
          </div>
        )}

        <Toolbar
          lang={lang} setLang={setLang}
          query={query} setQuery={setQuery}
          filters={filters} setFilters={setFilters}
          view={tweak.layout} setView={v => updateTweak({ layout: v as Tweaks['layout'] })}
          onNewTask={newTask}
          onOpenPalette={() => setPaletteOpen(true)}
          onOpenColumns={() => setSettingsOpen(true)}
          onOpenTweaks={() => setTweakOpen(o => !o)}
          onExport={exportTasks}
        />

        {loading ? (
          <div style={{ padding: '60px 22px', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-4)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
            Loading…
          </div>
        ) : tasks.length === 0 ? (
          <div style={{ padding: '80px 22px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)', letterSpacing: '.08em', textTransform: 'uppercase' }}>No tasks yet</span>
            <button className="btn btn--accent" onClick={newTask}>
              <Icon name="plus" size={13} /> {t.new_task}
            </button>
          </div>
        ) : tweak.layout === 'table' ? (
          <Table
            tasks={filtered} lang={lang}
            sortKey={sortKey} sortDir={sortDir} onSort={onSort}
            onOpen={setOpenId} onUpdate={updateTask} onDelete={deleteTask}
            selected={selected} setSelected={setSelected}
          />
        ) : (
          <Board tasks={filtered} lang={lang} onOpen={setOpenId} />
        )}
      </main>

      {openTask && (
        <Drawer
          task={openTask} lang={lang}
          claudeAccounts={claudeAccounts}
          taskTypes={taskTypes}
          onClose={() => setOpenId(null)}
          onUpdate={updateTask} onDelete={deleteTask}
        />
      )}

      {paletteOpen && (
        <Palette
          tasks={tasks} lang={lang}
          onClose={() => setPaletteOpen(false)}
          setLang={setLang}
          setView={v => updateTweak({ layout: v as Tweaks['layout'] })}
          setTheme={th => updateTweak({ theme: th as Tweaks['theme'] })}
          theme={tweak.theme}
          onOpen={setOpenId}
          onNewTask={newTask}
          setFilters={setFilters}
        />
      )}

      {settingsOpen && (
        <SettingsPanel
          items={listItems}
          onClose={() => setSettingsOpen(false)}
          onItemAdded={item => setListItems(prev => [...prev, item])}
          onItemRemoved={id => setListItems(prev => prev.filter(x => x.id !== id))}
        />
      )}

      {tweakOpen && (
        <TweaksPanel
          state={tweak}
          update={updateTweak}
          onClose={() => setTweakOpen(false)}
          lang={lang}
        />
      )}
    </div>
  );
}
