import {nodeById, childrenOf} from './framework.js?v=0.5.10';

// Renders the framework as a nested list. `states` maps node id -> chosen | open | dim;
// without states every node is shown neutrally. Proposals and community paths are author text and are never translated.
export function renderTree({t, states = null, proposal = null, focus = null, compact = false, community = []}) {
  const wrap = document.createElement('div');
  wrap.className = `tree${compact ? ' compact' : ''}`;
  wrap.setAttribute('data-no-i18n', '');
  const label = (n) => {
    const a = document.createElement('a');
    a.href = n.id === 'root' ? '#tree' : `#node/${n.id}`;
    a.className = `tree-node ${states ? `is-${states[n.id]}` : 'is-neutral'}${n.id === focus ? ' is-focus' : ''}`;
    a.textContent = t(n.title);
    if (states) a.setAttribute('aria-label', `${t(n.title)} · ${t({chosen:'你的路径', open:'仍然开放', dim:'已排除'}[states[n.id]])}`);
    if (n.id === focus) a.setAttribute('aria-current', 'page');
    return a;
  };
  const branch = (id) => {
    const n = nodeById[id];
    const li = document.createElement('li');
    li.append(label(n));
    if (id === 'changing') {
      const q = document.createElement('span');
      q.className = 'tree-quote';
      q.textContent = `“${t(n.summary)}”`;
      li.append(q);
    }
    const kids = childrenOf(id);
    const extra = [];
    if (n.note) {
      const note = document.createElement('li');
      note.className = `tree-note${states?.[id] === 'dim' ? ' is-dim' : ''}`;
      note.textContent = t(n.note);
      extra.push(note);
    }
    for (const c of community.filter(c => c.at === id)) {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.className = 'tree-node is-community';
      span.textContent = c.label;
      li.append(span);
      if (!compact) li.append(Object.assign(document.createElement('span'), {className: 'tree-by', textContent: t('提出：{0}', contributorsText(c, t))}));
      extra.push(li);
    }
    if (proposal?.at === id) {
      const p = document.createElement('li');
      const span = document.createElement('span');
      span.className = 'tree-node is-proposal';
      span.textContent = proposal.label;
      span.title = t('你提出的新分支');
      p.append(span);
      extra.push(p);
    }
    if (kids.length || extra.length) {
      const ul = document.createElement('ul');
      ul.append(...kids.map(k => branch(k.id)), ...extra);
      li.append(ul);
    }
    return li;
  };
  const root = document.createElement('ul');
  root.className = 'tree-root';
  root.append(branch('root'));
  wrap.append(root);
  return wrap;
}

export function contributorsText(path, t) {
  return path.contributors.length ? path.contributors.join(t('、')) : t('匿名贡献者');
}

export function treeLegend(t, {community = false} = {}) {
  const p = document.createElement('p');
  p.className = 'tree-legend';
  const items = [['is-chosen', '你的路径'], ['is-open', '仍然开放'], ['is-dim', '已排除'], ['is-proposal', '你提出的新分支']];
  if (community) items.push(['is-community', '社区线路']);
  for (const [cls, text] of items) {
    const item = document.createElement('span');
    const swatch = document.createElement('i');
    swatch.className = `tree-node ${cls}`;
    item.append(swatch, document.createTextNode(t(text)));
    p.append(item);
  }
  return p;
}
