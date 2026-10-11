// Verifica sintaxis, orden de scripts y referencias locales después de modificar archivos.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)],
    );
}
const files = walk(root);
let count = 0;
for (const file of files) {
  if (/\.(js|cjs)$/.test(file)) {
    new vm.Script(fs.readFileSync(file, "utf8"), { filename: file });
    count++;
  }
  if (/\.html$/.test(file)) {
    const html = fs.readFileSync(file, "utf8");
    for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      const value = match[1];
      if (/^(https?:|#|mailto:)/.test(value)) continue;
      if (!fs.existsSync(path.resolve(path.dirname(file), value.split("#")[0])))
        throw Error(`Referencia inválida: ${file} → ${value}`);
    }
    const combined = [...html.matchAll(/<script src="([^"]+)"/g)]
      .map((m) =>
        fs.readFileSync(path.resolve(path.dirname(file), m[1]), "utf8"),
      )
      .join("\n");
    new vm.Script(combined, { filename: file + ":scripts" });
  }
}
console.log(
  `Correcto: ${count} archivos JavaScript, entradas HTML y referencias locales.`,
);
