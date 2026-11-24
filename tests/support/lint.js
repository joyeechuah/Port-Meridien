// Static checks on the game's code: ESLint over the game's scripts (js/*.js, in the order index.html loads them) and
// any script inside index.html and 404.html, with rules that catch real mistakes (undefined names, duplicate keys,
// unreachable code and the like). The scripts share one global scope, so each is checked knowing the names the
// others declare. Two checks of our own: nothing that runs as a file loads uses a name from a later file
// (load-order.js), and every script tag keeps ?v=dev: the Pages workflow stamps the published copy (stage-site.js).
// Errors fail; warnings are listed. Run with `npm run lint`; CI runs it before the browser tests.
const fs = require("fs");
const path = require("path");
const acorn = require("acorn");
const { ESLint } = require("eslint");
const globals = require("globals");
const { scriptFiles } = require("./source");
const { checkLoadOrder } = require("./load-order");

const ROOT = path.resolve(__dirname, "..", "..");
const RULES = {
  "no-undef": "error", "no-dupe-keys": "error", "no-unreachable": "error", "no-redeclare": "error", "no-self-assign": "error",
  "no-dupe-else-if": "error", "no-duplicate-case": "error", "use-isnan": "error", "valid-typeof": "error", "no-loss-of-precision": "error",
  "no-self-compare": "error", "no-unsafe-negation": "error", "no-shadow-restricted-names": "error", "no-func-assign": "error",
  "no-const-assign": "error", "no-setter-return": "error", "no-dupe-args": "error", "no-compare-neg-zero": "error", "no-unsafe-finally": "error",
  "no-global-assign": "error", "getter-return": "error", "no-obj-calls": "error", "no-misleading-character-class": "error",
  "no-async-promise-executor": "error", "no-unsafe-optional-chaining": "error",
  "no-cond-assign": "warn", "no-fallthrough": "warn", "no-sparse-arrays": "warn", "no-constant-condition": ["warn", { checkLoops: false }],
  "no-unused-vars": ["warn", { vars: "local", args: "none", caughtErrors: "none" }], "no-unused-expressions": ["warn", { allowShortCircuit: true, allowTernary: true }],
  "no-empty": ["warn", { allowEmptyCatch: true }], "no-unmodified-loop-condition": "warn", "array-callback-return": "warn", "no-case-declarations": "warn",
};

// the names a script declares at its top level
function topNames(text) {
  const out = [];
  const pat = (p) => { if (!p) return; if (p.type === "Identifier") out.push(p.name); else if (p.type === "ObjectPattern") p.properties.forEach((q) => pat(q.type === "RestElement" ? q.argument : q.value)); else if (p.type === "ArrayPattern") p.elements.forEach(pat); else if (p.type === "AssignmentPattern") pat(p.left); else if (p.type === "RestElement") pat(p.argument); };
  for (const st of acorn.parse(text, { ecmaVersion: "latest", sourceType: "script" }).body) {
    if ((st.type === "FunctionDeclaration" || st.type === "ClassDeclaration") && st.id) out.push(st.id.name);
    else if (st.type === "VariableDeclaration") st.declarations.forEach((d) => pat(d.id));
  }
  return out;
}

(async () => {
  const linter = (extra = {}) => new ESLint({
    overrideConfigFile: true,
    overrideConfig: [{ languageOptions: { ecmaVersion: 2021, sourceType: "script", globals: { ...globals.browser, THREE: "readonly", ...extra } }, rules: RULES }],
  });
  const eslint = linter();
  let errors = 0,
    warnings = 0;
  const report = (file, line, col, kind, message, rule) => {
    if (kind === "error") errors++;
    else warnings++;
    console.log(`${file}:${line}:${col}  ${kind}  ${message}${rule ? `  (${rule})` : ""}`);
  };
  // the game's scripts: each one sees the others' top-level names as globals it may read and assign
  const files = scriptFiles();
  const names = files.map((f) => topNames(f.text));
  for (const [i, f] of files.entries()) {
    const others = {};
    names.forEach((list, j) => { if (j !== i) for (const n of list) others[n] = "writable"; });
    for (const n of names[i]) delete others[n];
    const [res] = await linter(others).lintText(f.text);
    for (const msg of res.messages) report(f.rel, msg.line, msg.column, msg.severity === 2 ? "error" : "warning", msg.message, msg.ruleId);
    if (f.stamp !== "dev") report("index.html", 1, 1, "error", `${f.rel} carries a stamp: keep ?v=dev (the Pages workflow stamps the published copy; npm run stamp puts it back)`, "");
  }
  for (const p of checkLoadOrder(files.map((f) => ({ name: f.rel, text: f.text })))) report(p.split(":")[0], +p.split(":")[1].split(" ")[0], 1, "error", p, "load-order");
  for (const file of ["index.html", "404.html"]) {
    const html = fs.readFileSync(path.join(ROOT, file), "utf8");
    for (const m of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
      const startLine = html.slice(0, m.index + m[0].indexOf(">") + 1).split("\n").length - 1;
      const [res] = await eslint.lintText(m[1]);
      for (const msg of res.messages) report(file, startLine + msg.line, msg.column, msg.severity === 2 ? "error" : "warning", msg.message, msg.ruleId);
    }
  }
  console.log(`\n${errors} error(s), ${warnings} warning(s)`);
  process.exit(errors ? 1 : 0);
})();
