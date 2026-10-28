import test from 'node:test';
import assert from 'node:assert/strict';
import {nodes, nodeById, childrenOf, questions, questionById, firstQuestion, walk, assess, journeyRecord, journeyMarkdown, questionsFor} from '../docs/framework.js';

const titles = id => childrenOf(id).map(n => n.title);

// Every complete or partial route through the question flow.
function routes() {
  const out = [];
  const visit = (qid, answers) => {
    out.push({answers, open: qid});
    if (!qid) return;
    for (const o of questionById[qid].options) visit(o.next || null, [...answers, {question: qid, option: o.id}]);
  };
  visit(firstQuestion, []);
  return out;
}

test('tree keeps the initiator framework: three ways, their branches and the 1—5 century range', () => {
  assert.equal(nodeById.root.title, '人类的可能终局与分支（1—5 个世纪）');
  assert.deepEqual(titles('root'), ['稳态', '消亡', '变化态']);
  assert.deepEqual(titles('steady'), ['童年社会', '极权统治', '永生统治', '机器统治', '外星统治', '持续条件与结束边界']);
  assert.deepEqual(titles('machine'), ['幻境', '宠物', '屠宰', '保护区']);
  assert.deepEqual(titles('immortal'), ['生物', '虚拟']);
  assert.deepEqual(titles('immortal-bio'), ['克隆']);
  assert.deepEqual(titles('boundary'), ['统治直到热寂', '直到被接管？', '直到灭绝？']);
  assert.deepEqual(titles('modes'), ['衰退', '战争']);
  assert.deepEqual(titles('changing'), ['太空', '重启', '时间概念的消失', '时空旅行者']);
  assert.deepEqual(titles('space'), ['探索', '生存']);
  assert.equal(nodeById.changing.summary, '我们离终局尚远。');
  assert.equal(nodeById.time.summary, '时间成为人类可以控制的东西。');
  assert.equal(nodeById['immortal-virtual'].note, '“虚拟”也可能由“生物”演变而来。');
});

test('questions start from existence, then ask about a ruler before anything about rule', () => {
  assert.equal(firstQuestion, 'exist');
  assert.deepEqual(questionById.exist.options.map(o => o.next), ['ruler', 'how-end']);
  assert.deepEqual(questionById.ruler.options.map(o => o.next), ['who', 'settled']);
});

test('the question graph is acyclic, fully reachable and only names real nodes', () => {
  const reached = new Set();
  const visit = (qid, seen) => {
    assert.ok(!seen.has(qid), `cycle at ${qid}`);
    reached.add(qid);
    for (const o of questionById[qid].options) {
      for (const id of [...(o.select || []), ...(o.keep || [])]) assert.ok(nodeById[id], `${qid}.${o.id} -> ${id}`);
      assert.ok(o.select || o.keep, `${qid}.${o.id} must narrow the tree`);
      if (o.next) visit(o.next, new Set([...seen, qid]));
    }
  };
  visit(firstQuestion, new Set());
  assert.deepEqual([...reached].sort(), questions.map(q => q.id).sort());
  for (const q of questions) assert.ok(nodeById[q.at], q.id);
});

test('every node of the tree can be reached by some answer', () => {
  const selectable = new Set(questions.flatMap(q => q.options.flatMap(o => o.select || [])));
  const covered = id => selectable.has(id) || childrenOf(id).some(c => covered(c.id));
  for (const n of nodes) if (n.id !== 'root') assert.ok(covered(n.id), n.id);
  for (const leaf of nodes.filter(n => !childrenOf(n.id).length)) assert.ok(questionsFor(leaf.id).length, leaf.id);
});

test('every route classifies each node exactly once and keeps the chosen nodes one connected path', () => {
  for (const {answers} of routes()) {
    for (const stop of [null, {type: 'uncertain'}]) {
      const r = assess(answers, stop);
      assert.equal(Object.keys(r.states).length, nodes.length);
      for (const n of nodes) {
        assert.ok(['chosen', 'open', 'dim'].includes(r.states[n.id]));
        if (r.states[n.id] === 'chosen' && n.parent) assert.equal(r.states[n.parent], 'chosen', n.id);
      }
      if (r.status === 'complete') {
        assert.ok(r.endpoint);
        assert.ok(!Object.values(r.states).includes('open'), 'a finished route leaves nothing open');
      }
    }
  }
});

test('answers narrow the tree the way the framework reads', () => {
  const gone = assess([{question: 'exist', option: 'no'}]);
  assert.equal(gone.states.steady, 'dim');
  assert.equal(gone.states.changing, 'dim');
  assert.equal(gone.states.decline, 'open');

  const unsure = assess([{question: 'exist', option: 'yes'}], {type: 'uncertain'});
  assert.equal(unsure.status, 'uncertain');
  assert.equal(unsure.current.id, 'ruler');
  assert.equal(unsure.states.extinct, 'dim');
  assert.equal(unsure.states.machine, 'open');
  assert.equal(unsure.states.childhood, 'open');

  const free = assess([{question: 'exist', option: 'yes'}, {question: 'ruler', option: 'no'}]);
  assert.equal(free.states.childhood, 'open');
  assert.equal(free.states.steady, 'open');
  assert.equal(free.states.machine, 'dim');

  const pet = assess([
    {question: 'exist', option: 'yes'}, {question: 'ruler', option: 'yes'}, {question: 'who', option: 'machine'},
    {question: 'human-place', option: 'pet'}, {question: 'until', option: 'takeover'}]);
  assert.equal(pet.status, 'complete');
  assert.equal(pet.endpoint.id, 'pet');
  assert.equal(pet.boundary.id, 'takeover');
  assert.equal(pet.states.machine, 'chosen');
  assert.equal(pet.states.reserve, 'dim');
  assert.equal(pet.states.childhood, 'dim');
});

test('answers out of order or unknown end the walk instead of being trusted', () => {
  assert.equal(walk([{question: 'ruler', option: 'yes'}]).steps.length, 0);
  assert.equal(walk([{question: 'exist', option: 'maybe'}]).steps.length, 0);
  assert.equal(walk('bad').current.id, 'exist');
  const r = walk([{question: 'exist', option: 'no'}, {question: 'how-end', option: 'war'}, {question: 'ruler', option: 'yes'}]);
  assert.equal(r.steps.length, 2);
  assert.equal(r.current, null);
});

test('a proposal needs words, is bounded, keeps author text literally and sits under the current question', () => {
  const answers = [{question: 'exist', option: 'yes'}, {question: 'ruler', option: 'yes'}];
  assert.equal(assess(answers, {type: 'proposal', label: '   '}).status, 'in-progress');
  const r = assess(answers, {type: 'proposal', label: ' <b>企业统治</b> '.padEnd(400, 'x'), reason: '理由'});
  assert.equal(r.status, 'proposal');
  assert.equal(r.proposal.at, 'steady');
  assert.equal(r.proposal.label.length, 120);
  assert.ok(r.proposal.label.startsWith('<b>企业统治</b>'));
  assert.equal(assess(answers.concat({question: 'who', option: 'alien'}, {question: 'until', option: 'takeover'}), {type: 'proposal', label: 'x'}).status, 'complete');
});

test('the export records choices, stays unpublished and never invents community numbers', () => {
  const answers = [{question: 'exist', option: 'yes'}, {question: 'ruler', option: 'no'}, {question: 'settled', option: 'stable'}];
  const record = journeyRecord({answers}, '2026-10-28T00:00:00Z');
  assert.equal(record.status, 'complete');
  assert.equal(record.endpoint, 'childhood');
  assert.equal(record.isVote, false);
  assert.equal(record.published, false);
  assert.equal(record.community.counts, null);
  const text = journeyMarkdown(record);
  assert.ok(text.includes('框架 1.0'));
  assert.ok(text.includes('1—5 个世纪后，人类还存在吗？ — 还存在'));
  assert.ok(text.includes('稳态 › 童年社会'));
  assert.ok(text.includes('尚无公开参与数据。'));
  assert.ok(!/\{\d\}/.test(text));

  const proposal = journeyRecord({answers: answers.slice(0, 2), stop: {type: 'proposal', label: '企业领地 <i>', reason: ''}});
  const md = journeyMarkdown(proposal, () => 'X');
  assert.ok(md.includes('企业领地 <i>'), 'author text is never translated or escaped away');
  assert.equal(proposal.stoppedAt, 'settled');
  assert.equal(proposal.proposal.at, 'root');
});
