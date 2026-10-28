// Framework 1.0: the initiator's tree of possible endings and the top-down question flow.
// Every node and answer is an arguable assumption; nothing here is a probability or forecast.
import {formatMessage} from './locale-core.js?v=0.5.6';
export const frameworkVersion = '1.0';
export const siteVersion = '0.5';

export const nodes = [
  {id:'root', title:'人类的可能终局与分支（1—5 个世纪）'},
  {id:'steady', parent:'root', title:'稳态', summary:'局面已经定型，在很长时间里不再发生根本改变。'},
  {id:'childhood', parent:'steady', title:'童年社会', summary:'人们进入黄金时期，为自我发展而活，一切梦想似乎都有实现的可能。社会异常平等、和谐、自由，仿佛一切关于大同社会的描述都是为了描述它。', ask:'谁在替人类处理难事，却不替人做决定？'},
  {id:'totalitarian', parent:'steady', title:'极权统治', summary:'少数人掌握决定全人类命运的权力，其他人无法替换他们。', ask:'过去的极权都被死亡、反抗或外部对手终结，这一次是什么让它延续？'},
  {id:'immortal', parent:'steady', title:'永生统治', summary:'掌权者不再死去，权力不再随死亡交接。', ask:'统治者不会死，权力还能怎样交接？'},
  {id:'immortal-bio', parent:'immortal', title:'生物', summary:'以生物的方式延续掌权者的生命。'},
  {id:'clone', parent:'immortal-bio', title:'克隆', summary:'以克隆延续掌权者。', ask:'克隆体是同一个人吗？它会继承原来的意志吗？'},
  {id:'immortal-virtual', parent:'immortal', title:'虚拟', summary:'掌权者的意识以数字形式延续。', note:'“虚拟”也可能由“生物”演变而来。', ask:'延续下来的是原来的人，还是一个相信自己是原来那个人的副本？'},
  {id:'machine', parent:'steady', title:'机器统治', summary:'机器掌握了决定人类命运的权力。', ask:'当机器不再需要人类的劳动和军队，人类还剩下什么筹码？'},
  {id:'illusion', parent:'machine', title:'幻境', summary:'人类生活在机器提供的幻境里：体验是真实的，世界不是。', ask:'如果体验对你来说是真实的，这样够不够？'},
  {id:'pet', parent:'machine', title:'宠物', summary:'人类被照顾得很好，但不能决定自己怎样生活。', ask:'被照顾得很好，能否替代自己做决定？'},
  {id:'slaughter', parent:'machine', title:'屠宰', summary:'人类被当作资源利用。', ask:'人类身上还有什么，是机器需要的？'},
  {id:'reserve', parent:'machine', title:'保护区', summary:'人类被留在一块划定的地方，既不受打扰，也得不到帮助。', ask:'边界由谁划定？人类能否走出去？'},
  {id:'alien', parent:'steady', title:'外星统治', summary:'外来的文明掌握了人类的命运。', ask:'我们能否理解一个与人类经验完全不同的统治者想要什么？'},
  {id:'boundary', parent:'steady', title:'持续条件与结束边界', summary:'统治会持续到哪里为止。'},
  {id:'heat-death', parent:'boundary', title:'统治直到热寂', summary:'统治一直持续到宇宙热寂。'},
  {id:'takeover', parent:'boundary', title:'直到被接管？', summary:'统治持续到被另一种力量接管。'},
  {id:'extinction', parent:'boundary', title:'直到灭绝？', summary:'统治持续到人类灭绝。'},
  {id:'extinct', parent:'root', title:'消亡', summary:'人类不再存在。'},
  {id:'modes', parent:'extinct', group:true, title:'消亡的方式', summary:'人类以什么方式走向消亡。'},
  {id:'decline', parent:'modes', title:'衰退', summary:'人口、知识和协作能力逐渐减少，没有一场明确的灾难。', ask:'低生育会持续很多代，还是会被生育更多的群体纠正？'},
  {id:'war', parent:'modes', title:'战争', summary:'人类在冲突中失去延续下去的能力。', ask:'一场战争能否让幸存者再也无法重建？'},
  {id:'changing', parent:'root', title:'变化态', summary:'我们离终局尚远。'},
  {id:'space', parent:'changing', title:'太空', summary:'人类走出地球。', ask:'多个居住地，是否足以让文明独立延续下去？'},
  {id:'explore', parent:'space', title:'探索', summary:'为了知道更多而出发。'},
  {id:'survive', parent:'space', title:'生存', summary:'为了活下去而离开地球。'},
  {id:'restart', parent:'changing', title:'重启', summary:'文明倒下，又重新开始。', ask:'重启的是文明，还是人类本身？'},
  {id:'time', parent:'changing', title:'时间概念的消失', summary:'时间成为人类可以控制的东西。', ask:'谁掌握时间？人人都可以，还是只有一方？'},
  {id:'traveler', parent:'changing', title:'时空旅行者', summary:'具体情景有待展开。'}
];

// Each question names the node under which a newly proposed answer would sit (`at`).
// An option either commits to nodes (`select`) or narrows what stays possible (`keep`).
export const questions = [
  {id:'exist', at:'root', prompt:'1—5 个世纪后，人类还存在吗？', help:'先从最大的问题开始。', options:[
    {id:'yes', label:'还存在', keep:['steady','changing'], next:'ruler'},
    {id:'no', label:'不再存在', select:['extinct'], next:'how-end'}]},
  {id:'how-end', at:'modes', prompt:'人类以什么方式消亡？', options:[
    {id:'decline', label:'衰退', select:['decline']},
    {id:'war', label:'战争', select:['war']}]},
  {id:'ruler', at:'root', prompt:'人类之上，有没有一个人类无法替换的掌权者？', help:'掌权者指能决定全人类命运、人类又无法替换的力量。仍会被更替或推翻的政府不算。', options:[
    {id:'yes', label:'有', select:['steady'], keep:['totalitarian','immortal','machine','alien','boundary'], next:'who'},
    {id:'no', label:'没有', keep:['childhood','changing'], next:'settled'}]},
  {id:'who', at:'steady', prompt:'掌权者是谁？', options:[
    {id:'few', label:'人类中的少数', hint:'极权统治', select:['totalitarian'], keep:['totalitarian','boundary'], next:'until'},
    {id:'immortal', label:'不会死去的人', hint:'永生统治', select:['immortal'], keep:['immortal','boundary'], next:'immortal-how'},
    {id:'machine', label:'机器', hint:'机器统治', select:['machine'], keep:['machine','boundary'], next:'human-place'},
    {id:'alien', label:'外星文明', hint:'外星统治', select:['alien'], keep:['alien','boundary'], next:'until'}]},
  {id:'immortal-how', at:'immortal', prompt:'掌权者以什么方式不死？', options:[
    {id:'bio', label:'生物（克隆）', select:['clone'], keep:['clone','boundary'], next:'until'},
    {id:'virtual', label:'虚拟', select:['immortal-virtual'], keep:['immortal-virtual','boundary'], next:'until'}]},
  {id:'human-place', at:'machine', prompt:'在机器统治下，人类处在什么位置？', options:[
    {id:'illusion', label:'幻境', select:['illusion'], keep:['illusion','boundary'], next:'until'},
    {id:'pet', label:'宠物', select:['pet'], keep:['pet','boundary'], next:'until'},
    {id:'slaughter', label:'屠宰', select:['slaughter'], keep:['slaughter','boundary'], next:'until'},
    {id:'reserve', label:'保护区', select:['reserve'], keep:['reserve','boundary'], next:'until'}]},
  {id:'until', at:'boundary', prompt:'这种统治会持续到什么时候？', options:[
    {id:'heat-death', label:'统治直到热寂', select:['heat-death']},
    {id:'takeover', label:'直到被接管？', select:['takeover']},
    {id:'extinction', label:'直到灭绝？', select:['extinction']}]},
  {id:'settled', at:'root', prompt:'没有掌权者的世界，局面稳定下来了吗？', options:[
    {id:'stable', label:'稳定下来', hint:'童年社会', select:['childhood']},
    {id:'changing', label:'仍在变化', hint:'变化态', select:['changing'], next:'change'}]},
  {id:'change', at:'changing', prompt:'变化主要来自哪里？', options:[
    {id:'space', label:'太空', select:['space'], next:'space-why'},
    {id:'restart', label:'重启', select:['restart']},
    {id:'time', label:'时间成为可控之物', hint:'时间概念的消失', select:['time']},
    {id:'traveler', label:'时空旅行者', select:['traveler']}]},
  {id:'space-why', at:'space', prompt:'人类走向太空，主要是为了什么？', options:[
    {id:'explore', label:'探索', select:['explore']},
    {id:'survive', label:'生存', select:['survive']}]}
];

export const firstQuestion = 'exist';
export const nodeById = Object.fromEntries(nodes.map(n => [n.id, n]));
export const questionById = Object.fromEntries(questions.map(q => [q.id, q]));
export const childrenOf = id => nodes.filter(n => n.parent === id);
export function ancestors(id) {
  const out = [];
  for (let n = nodeById[id]; n?.parent; n = nodeById[n.parent]) out.unshift(n.parent);
  return out;
}
export const branchOf = id => nodeById[[...ancestors(id), id][1]] || null;
function subtree(id) {
  return [id, ...childrenOf(id).flatMap(c => subtree(c.id))];
}
export const questionsFor = id => questions.filter(q => q.options.some(o => o.select?.includes(id)));

// Follow answers from the first question; anything out of order or unknown ends the walk.
export function walk(answers) {
  const steps = [];
  let qid = firstQuestion;
  for (const answer of Array.isArray(answers) ? answers : []) {
    const question = questionById[qid];
    const option = question?.options.find(o => o.id === answer?.option);
    if (!option || answer.question !== qid) break;
    steps.push({question, option});
    qid = option.next || null;
  }
  return {steps, current: qid ? questionById[qid] : null};
}

export function normalizeStop(stop) {
  if (stop?.type === 'uncertain') return {type:'uncertain'};
  if (stop?.type !== 'proposal' || typeof stop.label !== 'string') return null;
  const label = stop.label.trim().slice(0, 120);
  if (!label) return null;
  return {type:'proposal', label, reason: typeof stop.reason === 'string' ? stop.reason.trim().slice(0, 2000) : ''};
}

export function assess(answers, stop) {
  const {steps, current} = walk(answers);
  const halt = current ? normalizeStop(stop) : null;
  let possible = new Set(nodes.map(n => n.id));
  const chosen = new Set(['root']);
  for (const {option} of steps) {
    const scope = new Set((option.keep || option.select).flatMap(subtree));
    possible = new Set([...possible].filter(id => scope.has(id)));
    for (const id of option.select || []) for (const x of [...ancestors(id), id]) chosen.add(x);
  }
  const states = {};
  for (const n of nodes) {
    states[n.id] = chosen.has(n.id) ? 'chosen' : subtree(n.id).some(id => possible.has(id)) ? 'open' : 'dim';
  }
  const picked = steps.flatMap(s => s.option.select || []);
  const inBoundary = id => ancestors(id).includes('boundary');
  const endpointId = [...picked].reverse().find(id => !inBoundary(id));
  const boundaryId = picked.find(inBoundary);
  return {
    steps, current, states,
    status: !current ? 'complete' : halt ? halt.type : 'in-progress',
    endpoint: endpointId ? nodeById[endpointId] : null,
    boundary: boundaryId ? nodeById[boundaryId] : null,
    proposal: halt?.type === 'proposal' ? {...halt, at: current.at} : null
  };
}

export function journeyRecord({answers, stop, language = 'zh'} = {}, createdAt = new Date().toISOString()) {
  const r = assess(answers, stop);
  return {
    schemaVersion: 2, kind: 'local-ending-tree', framework: frameworkVersion, site: siteVersion, createdAt, language,
    answers: r.steps.map(s => ({question: s.question.id, option: s.option.id})),
    status: r.status,
    stoppedAt: r.status === 'complete' ? null : r.current.id,
    endpoint: r.endpoint?.id || null,
    boundary: r.boundary?.id || null,
    proposal: r.proposal,
    community: {status: 'unavailable', counts: null, uniqueHumansVerified: false},
    isVote: false, published: false
  };
}

const plain = (s, ...args) => formatMessage(s, args);

export function pathTitles(id, t = plain) {
  return [...ancestors(id), id].filter(x => x !== 'root').map(x => t(nodeById[x].title));
}

export function journeyMarkdown(record, t = plain) {
  const r = assess(record.answers, record.proposal ? {type:'proposal', ...record.proposal} : record.status === 'uncertain' ? {type:'uncertain'} : null);
  const lines = [
    `# ${t('我的终局之树')}`,
    `${t('状态')}: ${t('本地记录，尚未提交或表决。')}`,
    `${t('基于')}: ${t('终局之书 · 框架 {0} / 网站 {1}', frameworkVersion, siteVersion)}`,
    record.createdAt, '', `## ${t('我的选择')}`
  ];
  r.steps.forEach((s, i) => lines.push(`${i + 1}. ${t(s.question.prompt)} — ${t(s.option.label)}`));
  if (!r.steps.length) lines.push(t('尚未回答任何问题。'));
  lines.push('', `## ${t('我走到了')}`);
  if (r.status === 'complete') {
    lines.push(pathTitles(r.endpoint.id, t).join(' › '));
    if (r.boundary) lines.push(`${t('持续到')}: ${t(r.boundary.title)}`);
  } else {
    if (r.endpoint) lines.push(pathTitles(r.endpoint.id, t).join(' › '));
    lines.push(`${t('停在问题')}: ${t(r.current.prompt)}`);
    if (r.status === 'uncertain') lines.push(t('我还不确定；这一层下面的分支保持开放。'));
    if (r.proposal) {
      lines.push('', `## ${t('我提出的新分支')}`, record.proposal.label, `${t('位于')}: ${t(nodeById[r.proposal.at].title)}`);
      lines.push(`${t('理由')}: ${record.proposal.reason || t('未填写')}`);
    }
  }
  lines.push('', `## ${t('参与者怎么选')}`, t('尚无公开参与数据。'), t('选择人数不等于发生概率；账号不等于唯一自然人。'));
  return lines.join('\n');
}
