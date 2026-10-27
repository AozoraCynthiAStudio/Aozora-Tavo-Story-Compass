const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const code = fs.readFileSync(path.join(__dirname, '../plugin/entry.js'), 'utf8');
const start = code.indexOf('  function cleanText(');
const end = code.indexOf('  async function stillBound(', start);
assert(start >= 0 && end > start);
const ctx = {};
vm.runInNewContext(code.slice(start, end), ctx);
const routes = ['交集', '线索', '抉择', '开拓', '亲密'];
const block = (route, body, tag='draft') => `<suggestion><direction>${route}</direction><title>短入口</title><${tag}>${body}</${tag}></suggestion>`;
const five = routes.map((r,i) => block(r, `我提出第${i+1}个不同的想法，等她回答。`)).join('');
let checks = 0;
function test(name, fn) { fn(); checks++; console.log('PASS ' + name); }
test('five valid routes remain complete', () => assert.equal(ctx.missingRoutes(ctx.parseOptions(five).items).length, 0));
test('optional sixth is preserved', () => assert.equal(ctx.parseOptions(five+block('特殊','她主动提出再聊一会儿。')).items.length, 6));
test('one option is incomplete', () => assert.equal(ctx.missingRoutes(ctx.parseOptions(block('交集','我向门边的人问好。')).items).length, 4));
test('metadata-only XML is not story text', () => assert.equal(ctx.parseOptions('<suggestion><direction>线索</direction><event>寻找线索</event><title>窗外</title></suggestion>').items.length, 0));
test('blank drafts do not become cards', () => assert.equal(ctx.parseOptions(block('线索',' \u200b &#8203; &#x200b; &nbsp; ')).items.length, 0));
test('empty structured arrays do not fall back to raw JSON', () => assert.equal(ctx.parseOptions('{"options":[{"title":"只有标题","draft":""}]}').items.length, 0));
test('empty preferred JSON field allows valid alias', () => assert.equal(ctx.itemFrom({draft:'   ',text:'我问她有没有想去的地方。'},0).draft,'我问她有没有想去的地方。'));
test('objects cannot become draft strings', () => assert.equal(ctx.itemFrom({draft:{text:'unexpected'}},0),null));
test('placeholder is rejected', () => assert.equal(ctx.itemFrom({draft:'待补充'},0),null));
test('XML content aliases retain only body', () => {const r=ctx.parseOptions(block('线索','我询问那张纸条的来历。','content'));assert.equal(r.items[0].draft,'我询问那张纸条的来历。');});
test('mixed empty and valid XML preserves only valid bodies', () => assert.equal(ctx.parseOptions(block('交集','我向门边的人问好。')+block('线索','')+block('抉择','暂无')).items.length,1));
test('duplicate directions cannot satisfy five-route completeness', () => assert(ctx.missingRoutes(ctx.parseOptions(routes.map((r,i)=>block('交集','我提出第'+i+'个想法。')).join('')).items).length>0));
test('truncated XML cannot count as five complete routes', () => assert(ctx.missingRoutes(ctx.parseOptions(five.slice(0,-18)).items).length>0));
test('plain fallback cannot silently count as full batch', () => assert(ctx.missingRoutes(ctx.parseOptions('我站在门口，想了想，还是先问她有没有想去的地方。').items).length>0));
test('duplicates across routes cannot satisfy completeness', () => assert(ctx.missingRoutes(ctx.parseOptions(routes.map(r=>block(r,'我提出同一个问题。')).join('')).items).length>0));
const bodyFor = i => `我走向第${i}扇门，轻声问：“现在方便聊聊吗？”\n她抬起头，等我继续说。`;
test('numbered multiline fields form five cards, not field-line cards', () => {
  const raw=routes.map((r,i)=>`${i+1}.\n- 方向：${r}\n- 标题：门口的新话题${i}\n- 事件核心：询问一件新事情${i}\n- 正文：${bodyFor(i)}`).join('\n\n');
  const result=ctx.parseOptions(raw); assert.equal(result.items.length,5);assert.equal(ctx.missingRoutes(result.items).length,0);
  result.items.forEach((x,i)=>{assert.equal(x.title,'门口的新话题'+i);assert.equal(x.event,'询问一件新事情'+i);assert.equal(x.draft,bodyFor(i).replace(/\n/g,' '));});
});
test('numbered titles keep their following body paragraphs', () => {
  const result=ctx.parseOptions(routes.map((r,i)=>`${i+1}. ${r}｜新的相遇${i}\n${bodyFor(i)}`).join('\n\n'));
  assert.equal(result.items.length,5);assert(result.items.every(x=>x.draft.includes('等我继续说')));assert.equal(result.items[0].title,'新的相遇0');
});
test('markdown route headings group metadata and drafts together', () => {
  const result=ctx.parseOptions(routes.map((r,i)=>`### ${r}：短标题${i}\n事件：寻找一个话题${i}\n正文：${bodyFor(i)}`).join('\n\n'));
  assert.equal(result.items.length,5);assert.equal(result.items[0].draft,bodyFor(0).replace(/\n/g,' '));
});
test('flat XML fields recover five complete groups', () => {
  const result=ctx.parseOptions(routes.map((r,i)=>`<direction>${r}</direction><title>标题${i}</title><event>事件${i}</event><draft>${bodyFor(i)}</draft>`).join(''));
  assert.equal(result.items.length,5);assert.equal(result.items[0].title,'标题0');
});
test('numbered metadata-only headings never become a successful batch', () => {
  const result=ctx.parseOptions('1. 多出来的汤\n2. 温以蓁端汤敲门加入看球\n3. 门口新消息\n4. 交集\n5. 桌上的手机');
  assert.equal(result.items.length,0);
});
test('five arbitrary long lines are not manufactured into five cards', () => {
  const result=ctx.parseOptions(Array.from({length:5},(_,i)=>`这是一行未明确分项的叙述，包含较长的描述和第${i}个信息。`).join('\n'));
  assert(ctx.missingRoutes(result.items).length>0);
});
test('short but explicit drafts are accepted without word-count padding', () => {
  const result=ctx.parseOptions(routes.map((r,i)=>`${i+1}.\n方向：${r}\n标题：回应${i}\n正文：${['我点头。','我问：“谁？”','我摇头。','我指向门口。','我靠近一点。'][i]}`).join('\n'));
  assert.equal(result.items.length,5);
});
test('explicit empty body cannot be replaced by title or event', () => {
  const result=ctx.parseOptions('1.\n方向：交集\n标题：多出来的汤\n事件：温以蓁端汤敲门加入看球\n正文：\n2.\n方向：线索\n标题：旧照片\n正文：手机亮了，我伸手拿起来。');
  assert.equal(result.items.length,1);assert.equal(result.items[0].direction,'线索');assert.equal(result.items[0].draft,'手机亮了，我伸手拿起来。');
});
test('short numbered dialogue stays a complete single-line option', () => {
  const result=ctx.parseOptions(routes.map((r,i)=>`${i+1}. 我问：“第${i}件事，你怎么看？”`).join('\n'));
  assert.equal(result.items.length,5);
});
test('mismatched XML wrappers are not accepted as complete cards', () => {
  const result=ctx.parseOptions('<suggestion><direction>交集</direction><title>问好</title><draft>我向她问好。</draft></option>');
  assert(ctx.missingRoutes(result.items).length>0);
});
console.log(`Passed ${checks} parser/completeness checks. No live model calls.`);
