// Load-order check for the game's scripts (js/*.js, loaded in order by index.html, sharing one global scope).
//
// Inside one file, a function declared further down can be called before its line, because declarations are
// hoisted. Across files it can't: while an earlier file runs, a later file's functions and constants don't exist
// yet. So any code that runs as a file loads (not code inside functions that only run later, such as event
// handlers) must use only names from the same or earlier files. This walks what runs at load, including the
// functions it calls and callbacks that run straight away (forEach, map, sort and the like), and reports a name
// that comes from a later file. Names declared inside a function are its own and aren't counted.
const acorn = require("acorn");

const IMMEDIATE = new Set(["forEach", "map", "filter", "some", "every", "find", "findIndex", "findLast", "findLastIndex", "reduce", "reduceRight", "sort", "flatMap", "replace", "replaceAll"]);
const fnLike = (n) => n && (n.type === "FunctionExpression" || n.type === "ArrowFunctionExpression");

function patternNames(p) {
  if (!p) return [];
  switch (p.type) {
    case "Identifier": return [p.name];
    case "ObjectPattern": return p.properties.flatMap((q) => patternNames(q.type === "RestElement" ? q.argument : q.value));
    case "ArrayPattern": return p.elements.flatMap(patternNames);
    case "AssignmentPattern": return patternNames(p.left);
    case "RestElement": return patternNames(p.argument);
  }
  return [];
}

// every name a function declares for itself (parameters, its variables, inner function names), not looking
// inside nested functions
function ownNames(fn) {
  const out = new Set(fn.params.flatMap(patternNames));
  if (fn.id && fn.type === "FunctionExpression") out.add(fn.id.name);
  (function walk(n) {
    if (!n || typeof n.type !== "string") return;
    if (n.type === "VariableDeclaration") n.declarations.forEach((d) => patternNames(d.id).forEach((x) => out.add(x)));
    if (n.type === "FunctionDeclaration" || n.type === "ClassDeclaration") { if (n.id) out.add(n.id.name); if (n.type === "FunctionDeclaration") return; }
    if (n.type === "CatchClause" && n.param) patternNames(n.param).forEach((x) => out.add(x));
    if (fnLike(n)) return;
    for (const k in n) { if (k === "loc") continue; const v = n[k]; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v.type === "string") walk(v); }
  })(fn.body);
  return out;
}

// names used by code that runs now, and the top-level functions it calls now
function scan(node, used, calls, local) {
  if (!node || typeof node.type !== "string") return;
  switch (node.type) {
    case "FunctionDeclaration": case "FunctionExpression": case "ArrowFunctionExpression": return;   // runs later
    case "Identifier": if (!local.has(node.name)) used.add(node.name); return;
    case "MemberExpression": scan(node.object, used, calls, local); if (node.computed) scan(node.property, used, calls, local); return;
    case "Property": if (node.computed) scan(node.key, used, calls, local); scan(node.value, used, calls, local); return;
    case "MethodDefinition": case "PropertyDefinition": if (node.computed) scan(node.key, used, calls, local); if (node.static && node.value && !fnLike(node.value)) scan(node.value, used, calls, local); return;
    case "LabeledStatement": scan(node.body, used, calls, local); return;
    case "BreakStatement": case "ContinueStatement": return;
    case "CallExpression": case "NewExpression": {
      const c = node.callee;
      if (fnLike(c)) scanBody(c, used, calls);
      else { scan(c, used, calls, local); if (c.type === "Identifier" && !local.has(c.name)) calls.add(c.name); }
      const now = (c.type === "MemberExpression" && !c.computed && (IMMEDIATE.has(c.property.name) || (c.object.type === "Identifier" && c.object.name === "Array" && c.property.name === "from"))) || (node.type === "NewExpression" && c.type === "Identifier" && c.name === "Promise");
      for (const a of node.arguments) {
        if (fnLike(a)) { if (now) scanBody(a, used, calls); }
        else { scan(a, used, calls, local); if (now && a.type === "Identifier" && !local.has(a.name)) calls.add(a.name); }
      }
      return;
    }
  }
  for (const k in node) {
    if (k === "loc") continue;
    const v = node[k];
    if (Array.isArray(v)) v.forEach((x) => scan(x, used, calls, local));
    else if (v && typeof v.type === "string") scan(v, used, calls, local);
  }
}
function scanBody(fn, used, calls) { scan(fn.body, used, calls, ownNames(fn)); }

// files: [{name, text}] in load order. Returns a list of problems (strings).
function checkLoadOrder(files) {
  const decl = new Map(), stmts = [];
  files.forEach((f, i) => {
    const ast = acorn.parse(f.text, { ecmaVersion: "latest", sourceType: "script", locations: true });
    for (const st of ast.body) {
      stmts.push({ st, file: i });
      const add = (n) => decl.set(n, { file: i, line: st.loc.start.line, node: st });
      if (st.type === "FunctionDeclaration" || st.type === "ClassDeclaration") add(st.id.name);
      else if (st.type === "VariableDeclaration") st.declarations.forEach((d) => patternNames(d.id).forEach(add));
    }
  });
  const memo = new Map();
  const callsOf = (name, seen) => {
    if (memo.has(name)) return memo.get(name);
    const d = decl.get(name), res = new Set();
    if (!d || d.node.type !== "FunctionDeclaration" || seen.has(name)) return res;
    seen.add(name);
    const used = new Set(), calls = new Set();
    scanBody(d.node, used, calls);
    used.forEach((n) => res.add(n));
    for (const c of calls) callsOf(c, seen).forEach((n) => res.add(n));
    memo.set(name, res);
    return res;
  };
  const problems = [];
  for (const { st, file } of stmts) {
    if (st.type === "FunctionDeclaration") continue;
    const used = new Set(), calls = new Set();
    scan(st, used, calls, new Set());
    for (const c of calls) callsOf(c, new Set()).forEach((n) => used.add(n));
    const later = [...used].filter((n) => { const d = decl.get(n); return d && d.file > file; });
    if (later.length) {
      const say = (n) => { const d = decl.get(n); return `${n} (${files[d.file].name}:${d.line})`; };
      problems.push(`${files[file].name}:${st.loc.start.line} runs as the file loads and uses names from later files: ${later.slice(0, 4).map(say).join(", ")}${later.length > 4 ? ` and ${later.length - 4} more` : ""}`);
    }
  }
  return problems;
}

module.exports = { checkLoadOrder };
