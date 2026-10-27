// 시안(.dc.html) 템플릿을 일반 웹페이지에서 돌리는 작은 실행기.
// build.py가 템플릿을 JSON 트리(window.DC_TREE)로 바꿔 넣고, 페이지의 Component 클래스를 그대로 쓴다.
(function () {
  class DCLogic {
    constructor(props) { this.props = props || {}; this.state = {}; }
    setState(patch) { Object.assign(this.state, typeof patch === 'function' ? patch(this.state) : patch); render(); }
    forceUpdate() { render(); }
  }
  window.DCLogic = DCLogic;

  const HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  function lookup(path, scope) {
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), scope);
  }
  function whole(v) { const m = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/.exec(v); return m ? m[1] : null; }
  function interp(s, scope) { return s.replace(HOLE, (_, p) => { const v = lookup(p, scope); return v == null ? '' : String(v); }); }
  function truthy(v) { return !(v == null || v === false || v === 'false' || v === '' || v === 0); }

  const SVG_NS = 'http://www.w3.org/2000/svg';
  function build(node, scope, parent, svg) {
    if (typeof node === 'string') { parent.appendChild(document.createTextNode(interp(node, scope))); return; }
    const [tag, attrs, kids] = node;
    if (tag === 'helmet') return;
    if (tag === 'sc-for') {
      const list = lookup(whole(attrs.list), scope) || [];
      list.forEach((item, i) => {
        const s = Object.assign({}, scope, { [attrs.as]: item, $index: i });
        kids.forEach(k => build(k, s, parent, svg));
      });
      return;
    }
    if (tag === 'sc-if') {
      if (truthy(lookup(whole(attrs.value), scope))) kids.forEach(k => build(k, scope, parent, svg));
      return;
    }
    const inSvg = svg || tag === 'svg';
    const el = inSvg ? document.createElementNS(SVG_NS, tag) : document.createElement(tag);
    for (const [name, raw] of Object.entries(attrs)) {
      const w = whole(raw);
      if (/^on[A-Z]/.test(name)) {
        const fn = w ? lookup(w, scope) : null;
        if (typeof fn === 'function') el.addEventListener(name.slice(2).toLowerCase(), e => { if (el.tagName === 'BUTTON' && el.type === 'submit') e.preventDefault(); fn(e); });
        continue;
      }
      if (/^hint-/.test(name)) continue;
      const val = w ? lookup(w, scope) : interp(raw, scope);
      if (val == null || val === false) continue;
      el.setAttribute(name, val === true ? '' : String(val));
    }
    kids.forEach(k => build(k, scope, el, inSvg && tag !== 'foreignObject'));
    parent.appendChild(el);
  }

  let comp = null, root = null;
  function render() {
    const vals = comp.renderVals();
    const frag = document.createDocumentFragment();
    window.DC_TREE.forEach(n => build(n, vals, frag, false));
    root.replaceChildren(frag);
  }
  document.addEventListener('DOMContentLoaded', () => {
    root = document.getElementById('dc-root');
    comp = new window.Component({});
    render();
    if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
  });
})();
