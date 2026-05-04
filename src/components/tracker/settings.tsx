import { useState } from 'react';
import Icon from './icons';
import { type ListItem, addListItem, removeListItem } from './api';

interface SettingsPanelProps {
  items: ListItem[];
  onClose: () => void;
  onItemAdded: (item: ListItem) => void;
  onItemRemoved: (id: number) => void;
}

export function SettingsPanel({ items, onClose, onItemAdded, onItemRemoved }: SettingsPanelProps) {
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="settings-panel" role="dialog" aria-label="Settings">
        <div className="settings-panel__head">
          <h2>Settings</h2>
          <button className="btn btn--ghost btn--icon" onClick={onClose}>
            <Icon name="x" size={14} />
          </button>
        </div>
        <div className="settings-panel__body">
          <ListSection
            label="Claude Accounts"
            listKey="claude_accounts"
            items={items.filter(x => x.list_key === 'claude_accounts')}
            onItemAdded={onItemAdded}
            onItemRemoved={onItemRemoved}
          />
          <ListSection
            label="Task Types"
            listKey="task_types"
            items={items.filter(x => x.list_key === 'task_types')}
            onItemAdded={onItemAdded}
            onItemRemoved={onItemRemoved}
          />
        </div>
      </div>
    </>
  );
}

interface ListSectionProps {
  label: string;
  listKey: string;
  items: ListItem[];
  onItemAdded: (item: ListItem) => void;
  onItemRemoved: (id: number) => void;
}

function ListSection({ label, listKey, items, onItemAdded, onItemRemoved }: ListSectionProps) {
  const [input, setInput] = useState('');
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    const val = input.trim();
    if (!val || adding) return;
    setAdding(true);
    try {
      const id = await addListItem(listKey, val);
      onItemAdded({ id, list_key: listKey, value: val, sort_order: items.length });
      setInput('');
    } catch (e) {
      console.error('[Settings] addListItem failed:', e);
    } finally {
      setAdding(false);
    }
  }

  function handleRemove(id: number) {
    onItemRemoved(id);
    removeListItem(id).catch(console.error);
  }

  return (
    <div className="list-section">
      <div className="field__label">{label}</div>
      <div className="list-items">
        {items.map(item => (
          <div key={item.id} className="list-item">
            <span>{item.value}</span>
            <button className="list-item__del" onClick={() => handleRemove(item.id)} title="Remove">
              <Icon name="x" size={11} />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <div className="list-item list-item--empty">No items yet</div>
        )}
      </div>
      <div className="list-add">
        <input
          className="input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder={`Add to ${label.toLowerCase()}…`}
        />
        <button
          className="btn btn--accent"
          onClick={handleAdd}
          disabled={adding || !input.trim()}
        >
          {adding ? '…' : <Icon name="plus" size={13} />}
        </button>
      </div>
    </div>
  );
}
