// Type-checks the game's scripts with TypeScript: plain JavaScript checked as it is (checkJs), leniently, in the
// order index.html loads them, as one program sharing one global scope as in the browser. npm run lint runs it;
// npm run typecheck runs it alone. Options come from tsconfig.json (which editors read too); what comes from
// outside the game is in types/globals.d.ts. A false report is settled where it is, with a JSDoc cast
// (/** @type {any} */ (x)) or a typed default, never with a blanket ignore.
const path = require("path");
const ts = require("typescript");
const { ROOT, scriptFiles } = require("./source");

const cfg = ts.readConfigFile(path.join(ROOT, "tsconfig.json"), ts.sys.readFile);
if (cfg.error) throw new Error(ts.flattenDiagnosticMessageText(cfg.error.messageText, "\n"));
const { options } = ts.parseJsonConfigFileContent(cfg.config, ts.sys, ROOT);
const files = [path.join(ROOT, "types", "globals.d.ts"), ...scriptFiles().map((f) => path.join(ROOT, f.rel))];
const diags = ts.getPreEmitDiagnostics(ts.createProgram(files, options));
for (const d of diags) {
  let where = "";
  if (d.file) { const { line, character } = d.file.getLineAndCharacterOfPosition(d.start); where = `${path.relative(ROOT, d.file.fileName)}:${line + 1}:${character + 1}  `; }
  console.log(`${where}TS${d.code}  ${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`);
}
console.log(`${diags.length} type error(s)`);
process.exitCode = diags.length ? 1 : 0;
