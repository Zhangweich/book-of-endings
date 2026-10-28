import {initI18n, t} from './i18n.js?v=0.5.6';
await initI18n();
import {nodeById, childrenOf, ancestors, branchOf, questionsFor, nodes, questionById, firstQuestion} from './framework.js?v=0.5.6';
import {createJourney} from './journey.js?v=0.5.6';
import {renderTree} from './tree.js?v=0.5.6';
import {illustration} from './art.js?v=0.5.6';
import {createStore} from './store.js?v=0.5.6';
import {backend} from './config.js?v=0.5.6';

const $ = id => document.getElementById(id);
const el = (tag, cls = '', text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};
const link = (cls, href, text) => { const a = el('a', cls, text); a.href = href; return a; };
const branches = [['steady', '一', 'tone-steady'], ['extinct', '二', 'tone-extinct'], ['changing', '三', 'tone-changing']];
// Grouping nodes (such as "ways of ending") show their children directly as cards.
const cardsFor = id => childrenOf(id).flatMap(c => c.group ? childrenOf(c.id) : [c]);

let toastTimer;
function toast(text) {
  $('toast').textContent = text; $('toast').hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 5000);
}
function download(text, name, type) {
  const url = URL.createObjectURL(new Blob([text], {type}));
  const a = link('', url); a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  toast(t('已导出。文件只在你的设备上。'));
}

function nodeCard(n) {
  const card = link('card', `#node/${n.id}`);
  card.append(el('h3', 'card-heading', t(n.title)));
  const parent = nodeById[n.parent];
  const by = el('p', 'card-by');
  by.append(document.createTextNode(`${t('属于')} `), el('b', '', t(parent.group ? nodeById[parent.parent].title : parent.title)));
  card.append(by);
  if (n.summary) card.append(el('p', 'card-text', t(n.summary)));
  const kids = childrenOf(n.id);
  if (kids.length) card.append(el('p', 'card-kids', `${t('下一层')}：${kids.map(k => t(k.title)).join(' · ')}`));
  card.append(el('span', 'card-read', `${t('阅读')} →`), el('span', 'card-tag', t(branchOf(n.id).title)));
  return card;
}

function spotlightTile(id, number, color) {
  const n = nodeById[id];
  const tile = link('spotlight tile', `#node/${id}`);
  tile.append(illustration(id));
  const box = el('div', `spotlight-card ${color}`);
  const count = nodes.filter(x => ancestors(x.id).includes(id)).length;
  box.append(el('p', 'card-kicker', t('第{0}种去向', t(number))), el('h3', 'card-title', t(n.title)), el('p', 'card-row card-dek', t(n.summary)));
  box.append(el('p', 'card-row mono', t('{0} 个节点', count)), el('span', 'card-row card-link', `${t('阅读')} →`));
  tile.append(box);
  return tile;
}

function renderHome() {
  $('hero-art').replaceChildren(illustration('hero'));
  const root = $('branch-sections');
  root.replaceChildren();
  for (const [id, number, color] of branches) {
    const section = el('section', 'branch');
    section.setAttribute('aria-label', t(nodeById[id].title));
    const grid = el('div', 'branch-grid');
    const cards = el('div', 'cards');
    cards.append(...cardsFor(id).map(nodeCard));
    grid.append(spotlightTile(id, number, color), cards);
    section.append(grid);
    root.append(section);
  }
}

function renderNode(id) {
  const n = nodeById[id];
  const root = $('node-root');
  root.replaceChildren();
  const crumbs = el('nav', 'crumbs');
  crumbs.setAttribute('aria-label', t('所在位置'));
  for (const a of ancestors(id)) crumbs.append(link('', a === 'root' ? '#tree' : `#node/${a}`, t(nodeById[a].title)), el('span', 'crumb-sep', '›'));
  crumbs.append(el('span', 'crumb-here', t(n.title)));
  const head = el('header', 'node-head');
  const chips = el('div', 'chip-row');
  chips.append(el('span', 'chip solid', t(branchOf(id).title)));
  const h1 = el('h1', '', t(n.title));
  h1.tabIndex = -1;
  head.append(crumbs, chips, h1);
  if (n.summary) head.append(el('p', 'node-summary', t(n.summary)));

  const body = el('div', 'node-body');
  const main = el('div', 'node-main');
  if (n.ask) {
    const ask = el('section', 'ask');
    ask.append(el('h2', 'section-title', t('值得追问')), el('p', '', t(n.ask)));
    main.append(ask);
  }
  if (n.note) main.append(el('p', 'note', t(n.note)));
  const kids = cardsFor(id);
  if (kids.length) {
    const next = el('section', 'node-kids');
    const cards = el('div', 'cards');
    cards.append(...kids.map(nodeCard));
    next.append(el('h2', 'section-title', t('下一层')), cards);
    main.append(next);
  }
  const flow = el('section', 'in-flow');
  flow.append(el('h2', 'section-title', t('在选择流程中')));
  const q = questionsFor(id)[0];
  if (q) {
    const option = q.options.find(o => o.select?.includes(id));
    flow.append(el('p', '', t('在问题“{0}”中，回答“{1}”会走到这里。', t(q.prompt), t(option.label))));
  }
  flow.append(link('btn solid', '#start', `${t('从第一个问题开始')} →`));
  main.append(flow);

  const aside = el('aside', 'node-aside');
  const path = [...ancestors(id), id];
  const states = Object.fromEntries(nodes.map(x => [x.id, path.includes(x.id) ? 'chosen' : 'open']));
  aside.append(el('h2', 'section-title', t('在整棵树中的位置')), renderTree({t, states, focus: id, compact: true}));
  body.append(main, aside);
  root.append(head, body);

  const siblings = childrenOf(n.parent).filter(x => x.id !== id);
  if (siblings.length) {
    const nav = el('nav', 'node-siblings');
    nav.setAttribute('aria-label', t('同一层'));
    nav.append(el('span', 'trail-label', t('同一层')));
    for (const s of siblings) nav.append(link('chip', `#node/${s.id}`, t(s.title)));
    root.append(nav);
  }
}

const journey = createJourney({root: $('journey-root'), download, store: createStore({backend})});
const views = ['home', 'start', 'tree', 'node', 'rules'];
function route() {
  const [name, arg] = location.hash.slice(1).split('/');
  let view = views.includes(name) ? name : 'home';
  if (view === 'node' && (!nodeById[arg] || arg === 'root')) view = 'tree';
  for (const v of views) $(`view-${v}`).hidden = v !== view;
  for (const a of document.querySelectorAll('[data-nav]')) {
    if (a.dataset.nav === view) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
  if (view === 'start') journey.render();
  if (view === 'node') renderNode(arg);
  document.title = view === 'node' ? `${t(nodeById[arg].title)} · ${t('终局之书')}` : t('终局之书');
  window.scrollTo(0, 0);
  if (location.hash) document.querySelector(`#view-${view} h1`)?.focus({preventScroll: true});
}

// First visit: show the first question straight away; answering continues on the journey page.
const introKey = 'book-of-endings:intro-seen';
function introSeen() { try { return localStorage.getItem(introKey) === '1'; } catch { return false; } }
function markIntroSeen() { try { localStorage.setItem(introKey, '1'); } catch {} }
function leaveIntro(answers, stop, options) {
  $('intro').close();
  journey.begin(answers, stop, options);
  if (location.hash === '#start') route(); else location.hash = 'start';
}
function renderIntro() {
  const q = questionById[firstQuestion];
  const body = $('intro-body');
  const chips = el('div', 'chip-row');
  chips.append(el('span', 'chip solid', t('开始选择')), el('span', 'chip', t('问题 {0}', 1)));
  const title = el('h2', 'intro-question', t(q.prompt));
  title.id = 'intro-title';
  const options = el('div', 'options');
  for (const o of q.options) {
    const b = el('button', 'option');
    b.type = 'button';
    b.append(el('span', 'option-label', t(o.label)), el('span', 'option-arrow', '→'));
    b.addEventListener('click', () => leaveIntro([{question: q.id, option: o.id}]));
    options.append(b);
  }
  const more = el('div', 'other-actions');
  const unsure = el('button', 'btn', t('不确定'));
  unsure.type = 'button';
  unsure.addEventListener('click', () => leaveIntro([], {type: 'uncertain'}));
  const other = el('button', 'btn', `+ ${t('添加我的选项')}`);
  other.type = 'button';
  other.addEventListener('click', () => leaveIntro([], null, {propose: true}));
  more.append(unsure, other);
  const later = el('button', 'text-button intro-later', t('先随便看看'));
  later.type = 'button';
  later.addEventListener('click', () => $('intro').close());
  body.replaceChildren(chips, title, el('p', 'question-help', t(q.help)), options, more, later);
}
$('intro').addEventListener('click', e => { if (e.target === $('intro')) $('intro').close(); });

function renderAll() {
  renderHome();
  $('full-tree').replaceChildren(renderTree({t}));
  route();
  if ($('intro').open) renderIntro();
}
window.addEventListener('hashchange', route);
window.addEventListener('book-language-change', renderAll);
renderAll();
if (!introSeen() && (!location.hash || location.hash === '#home')) {
  markIntroSeen();
  renderIntro();
  $('intro').showModal();
}
