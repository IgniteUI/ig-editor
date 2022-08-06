const fs = require("fs");
const rimraf = require("rimraf");

const workerEntryPoints = [
	'node_modules/monaco-editor/esm/vs/language/json/json.worker.js',
	'node_modules/monaco-editor/esm/vs/language/css/css.worker.js',
	'node_modules/monaco-editor/esm/vs/language/html/html.worker.js',
	'node_modules/monaco-editor/esm/vs/language/typescript/ts.worker.js',
	'node_modules/monaco-editor/esm/vs/editor/editor.worker.js'
];

rimraf.sync("./dist/*");

require("esbuild").build({
    logLevel: "info",
    entryPoints: ["src/index.ts",
    "src/Exporter.ts",
    ...workerEntryPoints],
    entryNames: "[name]",
    bundle: true,
    minify: true,
    outdir: "dist",
    loader: {
		'.ttf': 'file',
        '.ts': 'ts',
        '.js': 'js'
	}
}).then(() => {
    require("./writeHtml");
});