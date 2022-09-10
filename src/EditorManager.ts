import { NativeUIElementBridge, NumericColumnDescription } from 'igniteui-webcomponents-core';
import * as monaco from 'monaco-editor';
import { strToColor } from 'igniteui-webcomponents-core';

type RGB = { r: number, g: number, b: number, a: number };
type HexColorPair = { hex: string, color: RGB };

(window as any).MonacoEnvironment = {
	getWorkerUrl: function (moduleId: string, label: string) {
		if (label === 'json') {
			return 'json.worker.js';
		}
		if (label === 'css' || label === 'scss' || label === 'less') {
			return 'css.worker.js';
		}
		if (label === 'html' || label === 'handlebars' || label === 'razor') {
			return 'html.worker.js';
		}
		if (label === 'typescript' || label === 'javascript') {
			return 'ts.worker.js';
		}
		return 'editor.worker.js';
	}
};

export class EditorManager
{
    private _editorContainer: HTMLElement;
    private _editor: monaco.editor.IStandaloneCodeEditor | null = null;

    private isValidDescription(obj: any): boolean {
        if (!obj.type) {
            return false;
        }

        return true;
    }

    private isValid(obj: any) {
        if (obj.descriptions) {
            for (var i = 0; i < obj.descriptions.length; i++) {
                if (!this.isValidDescription(obj.descriptions[i])) {
                    return false;
                }
            }
        }

        return true;
    }

    private isJsonString(str: string): boolean {
        try {
            var obj = JSON.parse(str);
            if (!this.isValid(obj)) {
                return false;
            }
        } catch (e) {
            return false;
        }
        return true;
    }

    private updateEditor(json: string) {
        if (this._editor === undefined)
            console.log("cannot update editor when editor is not initalized");
        else if (json === undefined)
            console.log("cannot update editor when passed JSON is undefined");
        else {
            console.log("updating editor ... ");
            this._editor!.getModel()!.setValue(json);
        }
    }

    private tryColor(str: string): RGB | null {
        let c = strToColor(str);
            let found = true;
            if ((isNaN(c.r) ||
                isNaN(c.g) ||
                isNaN(c.b) ||
                isNaN(c.a))
                ||                
                (c.r == 0 &&
                c.g == 0 &&
                c.b == 0 &&
                c.a == 255 &&
                str != null &&
                str.toLowerCase() != "black")) {
                found = false;
            }
        if (!found) {
            return null;
        }
        return c;
    }

    private getColorInfo(type: string, str: string, lineNumber: number, start: number, end: number) {
        var info: any = {};
        info.range = { // stores info where the the color is in the editor's content
            startLineNumber: lineNumber, endLineNumber: lineNumber,
            startColumn: start + 1, endColumn: end + 1,
        }

        var color = { r: 0, g: 0, b: 0, a: 0 };
        if (type === 'rgb') {
            var rgb = str.substring(start, end);
            let c = this.tryColor(rgb);
            if (!c) {
                return null;
            }
            // converting RGB to doubles per requitement of color picker
            color.r = c.r / 255;
            color.g = c.g / 255;
            color.b = c.b / 255;
            color.a = c.a / 255;

            info.range.endColumn = end + 2; // including the ending paratensis
        } else if (type === 'hex') {
            var hex = str.substring(start, end);
            var c = this.tryColor(hex);
            if (c) {
                color.r = c.r / 255;
                color.g = c.g / 255;
                color.b = c.b / 255;

                if (c.a) {
                    color.a = c.a / 255;
                } else {
                    color.a = 1;
                }
            }
        } else if (type === 'name') {

            var name = str.substring(start + 1, end);

            let c = strToColor(name);
            let found = true;
            if ((isNaN(c.r) ||
                isNaN(c.g) ||
                isNaN(c.b) ||
                isNaN(c.a))
                ||                
                (c.r == 0 &&
                c.g == 0 &&
                c.b == 0 &&
                c.a == 255 &&
                name != null &&
                name.toLowerCase() != "black")) {
                found = false;
            }
            // this.ensureColorLookup();
            // var found = this._colorLookup!.get(name);
            if (found) {
                //console.log("found " + name);
                color.r = c.r / 255;
                color.g = c.g / 255;
                color.b = c.b / 255;
                color.a = c.a / 255;
                // after starting quote
                info.range.startColumn = start + 2;
            } else {
                //console.log("not found='" + name + "' " + start + " " + end);
                return null;
            }
        } else {
            return null;
        }

        info.color = { red: color.r, blue: color.b, green: color.g, alpha: color.a };
        return info;
    }

    private getColorBox(lineNumber: number, str: string) {
        // check for rgba() format of colors
        var rgbaStart = str.indexOf('rgba(');
        var rgbaEnd = str.indexOf(')');

        // check for rgb() format of colors
        var rgbStart = str.indexOf('rgb(');
        var rgbEnd = str.indexOf(')');

        // check for hex format of colors
        var hexStart = str.indexOf('#');
        var hexEnd = str.lastIndexOf('"');

        // check for name colors
        var propStart = str.indexOf('"');
        var propEnd = str.lastIndexOf('"');

        if (rgbaStart >= 0 && rgbaEnd > 0) {
            //console.log(lineNumber + " rgba at " + (rgbaStart + 5) + " " + rgbaEnd + "=" + JSON.stringify(color));
            return this.getColorInfo('rgb', str, lineNumber, rgbaStart, rgbaEnd);

        } else if (rgbStart >= 0 && rgbEnd > 0) {
            return this.getColorInfo('rgb', str, lineNumber, rgbStart, rgbEnd);

        } else if (hexStart >= 0 && hexEnd > 0) {
            return this.getColorInfo('hex', str, lineNumber, hexStart, hexEnd);
        }

        else if (propStart >= 0 && propEnd > 0) {
            return this.getColorInfo('name', str, lineNumber, propStart, propEnd);
        }

        return null;
    }

    public updateContent(content: string): void {
        this._editor?.getModel()?.setValue(content);
    }

    public getCurrentContent(): string {
        return this._editor?.getModel()?.getValue()!;
    }

    public onEditorChanged: ((content: string) => void) | null = null;

    public loadEditors(schema: any): void {
        console.log("loading editors");

        var modelCode: any = "{\n}\n";

        
        var modelUri = monaco.Uri.parse("a://b/main.json");
        var model = monaco.editor.createModel(modelCode, 'json', modelUri);

        if (schema) {
            monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
                enableSchemaRequest: true,
                validate: true,
                schemaValidation: "error",
                schemas: [{
                    uri: "http://igSchema/igSchema.json",              
                    //schemaSeverityLevel: "error",
                    fileMatch: [modelUri.toString()],
                    schema: schema
                }]
            });
        }

        var div = document.getElementById("editor");
        this._editor = monaco.editor.create(this._editorContainer, {
            automaticLayout: true, autoIndent: "advanced", tabSize: 2,
            language: 'json',
            theme: 'vs-dark',
            model: model,
            lineNumbers: "on",  // TODO make it configurable
            fontSize: 12,       // TODO make it configurable
            folding: true,      // TODO make it configurable
            showFoldingControls: "always",
            //showStatusBar: true,
            formatOnPaste: false,
            //inlineHints: { enabled: false },
            //lightbulb: { enabled: false },
            //formatOnType: true,
            colorDecorators: true,
            minimap: {
                enabled: false, // TODO make it configurable
            },
            scrollbar: {
                // Subtle shadows to the left & top. Defaults to true.
                useShadows: true,
                // Render vertical arrows. Defaults to false.
                verticalHasArrows: true,
                // Render horizontal arrows. Defaults to false.
                horizontalHasArrows: true,
                // Render vertical scrollbar, values: 'auto', 'visible', 'hidden'.
                vertical: 'auto',
                verticalScrollbarSize: 15,
                // Render horizontal scrollbar, values: 'auto', 'visible', 'hidden'.
                horizontal: 'auto',
                horizontalScrollbarSize: 15,
                arrowSize: 15
            }
        });

        this._editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyR, function () {
            // editor is ignoring CTRL+R shortcut because it is used for reendering surfaces
        });

        this._editor.onDidChangeModelContent((e: any) => {
            console.log("here");
            var editorContent = this._editor!.getValue();
            if (this.isJsonString(editorContent)) {
                if (this.onEditorChanged) {
                    this.onEditorChanged(editorContent);
                }
                //window.chrome.webview.postMessage({ type: "valueChanged", value: editorContent });
            } else {
                console.log("invalid json");
            }
        });

        //TODO add option to change between dark theme and light theme
        monaco.editor.defineTheme('darkTheme', {
            base: 'vs-dark',
            inherit: true,
            rules: [{} as any], // [{ background: '00000000' }],
            colors: {
                'editor.background': '#2B2B2B',
                'editorLineNumber.foreground': '#8A8A8A',
                'editorCursor.foreground': '#20B806',
                'editorError.border': '#EF2B2B',
            }
        });
        monaco.editor.setTheme('darkTheme');

        // this code provides a color picker and vizualization of rgba(), rgb(), hex, or named colors in the editor
        monaco.languages.registerColorProvider("json", {
            provideColorPresentations: (model, colorInfo) => {
                // note color picker is using double to store color channels
                // but we need to display color in thier byte format
                var color = colorInfo.color;
                var r = Math.round(color.red * 255);
                var g = Math.round(color.green * 255);
                var b = Math.round(color.blue * 255);
                var label;
                if (color.alpha === 1) {
                    label = "rgb(" + r + ", " + g + ", " + b + ")";
                } else {
                    label = "rgba(" + r + ", " + g + ", " + b + ", " + color.alpha + ")";
                }
                return [{ label: label }];
            },
            provideDocumentColors: () => {
                var json = this._editor!.getValue();
                console.log("provideDocumentColors");
                var lines = json.split('\n');
                var colors = [];
                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i];
                    var lineNumber = i + 1;
                    var lineSetting = line.split(':');
                    if (lineSetting.length === 2) {
                        var lineProperty = lineSetting[0].toString();
                        var lineValue = lineSetting[1].toString();

                        var arrayStart = lineValue.indexOf('[');
                        var arrayEnd = lineValue.lastIndexOf(']');
                        // check for an array of colors
                        if (arrayStart >= 0 && arrayEnd > 0) {
                            var arrayStr = lineValue.substring(arrayStart + 1, arrayEnd);
                            var arrayItems = arrayStr.split('",');
                            //console.log("arrayItems=" + arrayItems.length);

                            var isHex = lineValue.indexOf('#') >= 0;
                            var isRGB = lineValue.indexOf('rgb') >= 0;

                            if (arrayItems && arrayItems.length > 0) {
                                var offset = lineProperty.length + 1 + arrayStart + 1;
                                for (var ii = 0; ii < arrayItems.length; ii++) {
                                    var arrayItem = arrayItems[ii];
                                    if (ii < arrayItems.length - 1)
                                        arrayItem = arrayItem + '"';

                                    //if (!isHex && !isRGB) {
                                    //    console.log("arrayItem=" + arrayItem);
                                    //}
                                    var info = this.getColorBox(lineNumber, arrayItem);
                                    if (info) {
                                        //console.log(lineProperty + "=" + lineProperty.length + " " + info.range.startColumn);
                                        info.range.startColumn = info.range.startColumn + offset;
                                        info.range.endColumn = info.range.endColumn + offset;
                                        colors.push(info);

                                        //if (!isHex && !isRGB) {
                                        //   console.log("info=" + JSON.stringify(info));
                                        //}
                                    }
                                    // offseting color range by lenght of the current color in the array
                                    offset += arrayItem.length + 1;
                                }
                            }
                        } else { // check for single color
                            var info = this.getColorBox(lineNumber, lineValue);
                            if (info) {
                                //console.log(lineProperty + "=" + lineProperty.length + " " + info.range.startColumn);
                                info.range.startColumn = info.range.startColumn + lineProperty.length + 1;
                                info.range.endColumn = info.range.endColumn + lineProperty.length + 1;
                                colors.push(info);
                            }
                        }
                    }
                }
                return colors;
            }
        })
    }

    public onValidationEvent(ev: any) {
        if (ev.data) {
            var msg = JSON.parse(ev.data);
            var markers = [];
            if (msg.warnings) {
                for (var i = 0; i < msg.warnings.length; i++) {
                    console.log(msg.warnings[i]);
                    markers.push({
                        startLineNumber: msg.warnings[i].line,
                        startColumn: msg.warnings[i].column,
                        endLineNumber: msg.warnings[i].line,
                        endColumn: msg.warnings[i].endColumn,
                        message: msg.warnings[i].message,
                        severity: monaco.MarkerSeverity.Warning
                    });
                }
            }
            monaco.editor.setModelMarkers(this._editor!.getModel()!, 'igValidator', markers)
        } else {
            monaco.editor.setModelMarkers(this._editor!.getModel()!, 'igValidator', [])
        }
    }

    constructor(editorContainer: HTMLElement) {
        this._editorContainer = editorContainer;

        window.addEventListener("message", (ev) => {
            //console.log("received message")
            //console.log(ev)
            if (ev.data) {
                //var msg = JSON.parse(ev.data);
                var msg = ev.data;
                if (msg.type == "ready" && this._editor) {
                    console.log("got ready message");
                    var editorContent = this._editor!.getValue();
                    if (this.isJsonString(editorContent)) {
                        if (this.onEditorChanged) {
                            this.onEditorChanged(editorContent);
                        }
                        //window.chrome.webview.postMessage({ type: "valueChanged", value: editorContent });
                    }
                }
                var markers = [];
                if (msg.warnings) {
                    var warnings = JSON.parse(msg.warnings).warnings;
                    for (var i = 0; i < warnings.length; i++) {
                        console.log(warnings[i]);
                        markers.push({
                            startLineNumber: warnings[i].line,
                            startColumn: warnings[i].column,
                            endLineNumber: warnings[i].line,
                            endColumn: warnings[i].endColumn,
                            message: warnings[i].message,
                            severity: monaco.MarkerSeverity.Warning
                        });
                    }
                }
                monaco.editor.setModelMarkers(this._editor!.getModel()!, 'igValidator', markers)
            } else {
                monaco.editor.setModelMarkers(this._editor!.getModel()!, 'igValidator', [])
            }
        });
    }
}