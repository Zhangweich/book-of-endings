import {nodeById, assess, journeyRecord, journeyMarkdown, pathTitles, branchOf} from './framework.js?v=0.5.8';
import {renderTree, treeLegend} from './tree.js?v=0.5.8';
import {illustration} from './art.js?v=0.5.8';
import {t, getLocale, localeTag} from './i18n.js?v=0.5.8';

const tones = {steady: 'tone-steady', extinct: 'tone-extinct', changing: 'tone-changing'};

export function createJourney({root, download, store}) {
  let {answers, stop} = store.me();
  let proposing = false, error = '';
  const el = (tag, cls = '', text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const tx = (tag, cls, source, ...args) => el(tag, cls, t(source, ...args));
  const button = (cls, text, fn) => { const b = el('button', cls, text); b.type = 'button'; b.addEventListener('click', fn); return b; };
  const record = () => journeyRecord({answers, stop, language: getLocale()});

  function go(nextAnswers, nextStop = null) {
    answers = nextAnswers; stop = nextStop; proposing = false; error = '';
    store.save({answers, stop});
    render();
    window.scrollTo(0, 0);
    root.querySelector('h1')?.focus({preventScroll: true});
  }

  function trail(steps) {
    const nav = el('nav', 'trail');
    nav.setAttribute('aria-label', t('你的选择'));
    nav.append(tx('span', 'trail-label', '你的选择'));
    if (!steps.length) nav.append(tx('span', 'trail-empty', '还没有选择'));
    steps.forEach((s, i) => {
      const b = button('chip', t(s.option.label), () => go(answers.slice(0, i)));
      b.title = t('改回答：{0}', t(s.question.prompt));
      nav.append(b);
      if (i < steps.length - 1) nav.append(el('span', 'trail-arrow', '→'));
    });
    return nav;
  }

  function renderQuestion(r) {
    const q = r.current;
    const layout = el('div', 'journey');
    const main = el('section', 'question');
    const head = el('div', 'chip-row');
    head.append(tx('span', 'chip solid', '开始选择'), tx('span', 'chip', '问题 {0}', r.steps.length + 1));
    const h1 = el('h1', '', t(q.prompt));
    h1.tabIndex = -1;
    main.append(head, h1);
    if (q.help) main.append(tx('p', 'question-help', q.help));
    const options = el('div', 'options');
    for (const o of q.options) {
      const b = button('option', '', () => go([...answers, {question: q.id, option: o.id}]));
      b.append(el('span', 'option-label', t(o.label)));
      if (o.hint) b.append(el('span', 'option-hint', t(o.hint)));
      b.append(el('span', 'option-arrow', '→'));
      options.append(b);
    }
    main.append(options);
    const more = el('div', 'other-actions');
    more.append(
      button('btn', t('不确定'), () => go(answers, {type: 'uncertain'})),
      button('btn', `+ ${t('添加我的选项')}`, () => { proposing = true; render(); root.querySelector('#proposal-label')?.focus(); })
    );
    main.append(more, tx('p', 'micro', '选“不确定”，就停在这一层，下面的分支保持开放。列表里没有你的答案，就添加你自己的选项。'));
    if (proposing) main.append(proposalForm(q));
    const nav = el('div', 'step-nav');
    if (answers.length) nav.append(button('text-button', `← ${t('上一步')}`, () => go(answers.slice(0, -1))), button('text-button', t('重新开始'), () => go([])));
    main.append(nav);

    const side = el('aside', 'journey-side');
    side.setAttribute('aria-label', t('你的树'));
    side.append(tx('h2', 'side-title', '你的树'), trail(r.steps), renderTree({t, states: r.states, compact: true}), treeLegend(t));
    layout.append(main, side);
    return layout;
  }

  function proposalForm(q) {
    const form = el('form', 'proposal');
    form.noValidate = true;
    form.append(tx('h2', '', '添加我的选项'), tx('p', 'micro', '它会挂在“{0}”下面，作为你添加的选项。', t(nodeById[q.at].title)));
    const name = tx('label', '', '你认为还有什么可能？');
    const input = el('input');
    input.id = 'proposal-label'; input.maxLength = 120; input.autocomplete = 'off';
    input.placeholder = t('写下一个新选项');
    name.append(input);
    const why = tx('label', '', '理由（可选）');
    const area = el('textarea');
    area.rows = 3; area.maxLength = 2000;
    why.append(area);
    const message = el('p', 'form-error', error);
    message.setAttribute('role', 'alert');
    const actions = el('div', 'form-actions');
    const submit = tx('button', 'btn solid', '加入我的树');
    submit.type = 'submit';
    actions.append(submit, button('btn', t('取消'), () => { proposing = false; error = ''; render(); }));
    form.append(name, why, message, actions);
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!input.value.trim()) { error = t('请写下一个新选项。'); message.textContent = error; input.focus(); return; }
      go(answers, {type: 'proposal', label: input.value, reason: area.value});
    });
    return form;
  }

  function endpointCard(r) {
    const card = el('article', 'spotlight result-spotlight');
    let branch = null, title, kicker, dek, ask = '', link = null;
    const lines = [];
    if (r.status === 'complete') {
      branch = branchOf(r.endpoint.id);
      title = t(r.endpoint.title);
      kicker = t('你走到了这里');
      lines.push(pathTitles(r.endpoint.id, t).join(' › '));
      if (r.boundary) lines.push(`${t('持续到')}：${t(r.boundary.title)}`);
      dek = t(r.endpoint.summary);
      if (r.endpoint.ask) ask = t(r.endpoint.ask);
      link = `#node/${r.endpoint.id}`;
    } else if (r.status === 'uncertain') {
      if (r.endpoint) { branch = branchOf(r.endpoint.id); lines.push(pathTitles(r.endpoint.id, t).join(' › ')); }
      title = t(r.current.prompt);
      kicker = t('你停在了这一层');
      dek = t('下面的分支仍然开放：{0}', r.current.options.map(o => t(o.hint || o.label)).join(t('、')));
    } else {
      if (r.proposal.at !== 'root') branch = branchOf(r.proposal.at);
      title = r.proposal.label;
      kicker = t('你添加了自己的选项');
      lines.push(`${t('位于')}：${t(nodeById[r.proposal.at].title)}`);
      dek = r.proposal.reason || t('（未填写理由）');
    }
    card.append(illustration(branch?.id || 'hero'));
    const box = el('div', `spotlight-card ${tones[branch?.id] || 'tone-neutral'}`);
    box.append(el('p', 'card-kicker', kicker), el('h2', 'card-title', title));
    for (const line of lines) box.append(el('p', 'card-row mono', line));
    box.append(el('p', 'card-row card-dek', dek));
    if (ask) box.append(el('p', 'card-row card-ask', `${t('值得追问')}：${ask}`));
    if (r.status === 'proposal') box.append(tx('p', 'card-row mono', '提交后，它会和其他人的选择一起被计数。'));
    if (link) { const a = el('a', 'card-row card-link', `${t('阅读这个节点')} →`); a.href = link; box.append(a); }
    card.append(box);
    return card;
  }

  function submitSection() {
    const me = store.me();
    const section = el('section', 'submit');
    section.append(tx('h2', 'section-title', '提交我的选择'), tx('p', 'micro', '提交后，你最新的一份选择会被计入。之后可以随时回来修改，再提交一次即可。'));
    const form = el('form', 'contact');
    form.noValidate = true;
    const field = (label, type, value, max, auto) => {
      const l = tx('label', '', label);
      const input = el('input');
      input.type = type; input.value = value; input.maxLength = max; input.autocomplete = auto;
      l.append(input);
      form.append(l);
      return input;
    };
    const nick = field('昵称（公开，可选）', 'text', me.nickname, 40, 'nickname');
    const mail = field('邮箱（只给维护者，不公开，可选）', 'email', me.email, 254, 'email');
    const status = el('p', 'submit-status');
    status.setAttribute('role', 'status');
    if (me.submittedAt) status.textContent = t('你上次提交于 {0}。', new Date(me.submittedAt).toLocaleString(localeTag()));
    const send = tx('button', 'btn solid', me.submittedAt ? '更新我的选择' : '提交并计入');
    send.type = 'submit';
    form.append(status, send, tx('p', 'micro', '昵称和邮箱也会保存在这台设备上，方便你下次修改。'), tx('p', 'micro', '邮箱只用于联系你，不会公开。想查看或删除你的记录，请写信到 contact@weichenzhang.com。'));
    form.addEventListener('submit', async e => {
      e.preventDefault();
      send.disabled = true;
      status.textContent = t('正在提交……');
      const result = await store.submit({nickname: nick.value, email: mail.value, language: getLocale()});
      send.disabled = false;
      status.textContent = t({
        invalid: '邮箱格式不对，请检查。',
        offline: '计数服务还没有接通。你的选择已保存在这台设备上，接通后再提交即可。',
        error: '提交没有成功，你的选择已保存在这台设备上，请稍后再试。',
        counted: '已计入。之后修改再提交，只会计入你最新的一份。'
      }[result.status]);
      if (result.status === 'counted') { send.textContent = t('更新我的选择'); renderCounts(); }
    });
    section.append(form);
    return section;
  }

  let countsBox = null;
  async function renderCounts() {
    const box = countsBox;
    if (!box) return;
    box.replaceChildren(tx('p', 'micro', '正在读取……'));
    const r = assess(answers, stop);
    const c = await store.counts();
    if (box !== countsBox) return;
    box.replaceChildren();
    if (c.status !== 'ok') {
      box.append(tx('p', 'community-empty', c.status === 'offline' ? '计数服务还没有接通。' : '暂时读不到计数，请稍后再试。'));
      return;
    }
    box.append(tx('p', 'community-empty', '共有 {0} 人提交。', c.people));
    const bar = (label, q, key) => {
      const n = c.options[`${q}:${key}`] || 0, total = c.questions[q] || 0;
      const row = el('div', 'count-row');
      const meter = el('span', 'count-bar');
      meter.style.setProperty('--share', total ? `${Math.round(n / total * 100)}%` : '0%');
      row.append(el('span', 'count-label', label), el('span', 'count-value', t('{0} 人', n)), meter);
      box.append(row);
    };
    r.steps.forEach(s => bar(t(s.option.label), s.question.id, s.option.id));
    if (r.status === 'uncertain') bar(t('不确定'), r.current.id, '+uncertain');
    if (r.status === 'proposal') bar(t('添加了自己的选项'), r.current.id, '+proposal');
  }

  function renderResult(r) {
    const wrap = el('div', 'result');
    const head = el('header', 'result-head');
    const chips = el('div', 'chip-row');
    chips.append(tx('span', 'chip solid', '你的树'));
    const h1 = tx('h1', '', {complete: '根据你的假设，你走到了这里。', uncertain: '你停在了这一层，下面的分支仍然开放。', proposal: '你添加了自己的选项。'}[r.status]);
    h1.tabIndex = -1;
    head.append(chips, h1);
    wrap.append(head, endpointCard(r));

    const grid = el('div', 'result-grid');
    const treeBox = el('section', 'result-tree');
    treeBox.append(tx('h2', 'section-title', '你的树'), renderTree({t, states: r.states, proposal: r.proposal}), treeLegend(t));
    const side = el('div', 'result-side');
    const list = el('section', 'answers');
    list.append(tx('h2', 'section-title', '你的回答'));
    const row = (question, answer, fn) => {
      const n = el('div', 'answer-row');
      n.append(el('span', 'answer-q', question), el('strong', 'answer-a', answer), button('text-button', t('修改'), fn));
      list.append(n);
    };
    r.steps.forEach((s, i) => row(t(s.question.prompt), t(s.option.label), () => go(answers.slice(0, i))));
    if (r.status !== 'complete') row(t(r.current.prompt), r.status === 'uncertain' ? t('不确定') : r.proposal.label, () => go(answers));
    const community = el('section', 'community');
    countsBox = el('div', 'counts');
    community.append(tx('h2', 'section-title', '参与者怎么选'), countsBox, tx('p', 'micro', '选择人数不等于发生概率。每人只计最新的一份；以设备区分，不能保证一人一票。'));
    const actions = el('div', 'form-actions');
    actions.append(
      button('btn', `${t('导出我的树')} ↓`, () => download(journeyMarkdown(record(), t), 'book-of-endings-my-tree.md', 'text/markdown')),
      button('btn', t('重新开始'), () => go([]))
    );
    side.append(list, submitSection(), community, actions, tx('p', 'micro', '你的选择保存在这台设备上，随时可以回来修改。'));
    grid.append(treeBox, side);
    wrap.append(grid);
    return wrap;
  }

  function render() {
    const r = assess(answers, stop);
    countsBox = null;
    root.replaceChildren(r.status === 'in-progress' ? renderQuestion(r) : renderResult(r));
    root.setAttribute('data-no-i18n', '');
    if (countsBox) renderCounts();
  }
  // Lets the first-visit popup hand over an answer before the journey page renders.
  function begin(nextAnswers, nextStop = null, {propose = false} = {}) {
    answers = nextAnswers; stop = nextStop; proposing = propose; error = '';
    store.save({answers, stop});
  }
  return {render, record, begin};
}
