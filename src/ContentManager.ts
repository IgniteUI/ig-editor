import * as libraryJson from './data/library.json';
import * as validationData from './data/validationData.json';

export class ContentManager {
    private _frameElement: HTMLIFrameElement;

    constructor (frameElement: HTMLIFrameElement) {
        this._frameElement = frameElement;
    }

    private _shared: string = `
    var platformPrefix = "{{platformPrefix}}";

function toCamel(value) {
    if (value == null || value == undefined) {
        return null;
    }
    return value.substr(0, 1).toLowerCase() + value.substr(1);
}

function getDescription(name) {
    if (name == "content") {
        if (cont.getRootObject) {
            return cont.getRootObject();
        } else {
            return cont.children[0];
        }
    }
    if (name == "editor") {
        if (editor.getRootObject) {
            return editor.getRootObject();
        } else {
            return editor.children[0];
        }
    }
    if (name == "legend") {
        if (legend.getRootObject) {
            return legend.getRootObject();
        } else {
            return legend.children[0];
        }
    }
}

function loadCodeData(key, codeDataText, allModules) {
    //key = toCamel(key);
    var classNameReg = \`\${platformPrefix}\\w+\`;
    var classNameRegex = new RegExp(classNameReg, "g");
    let matches = [...codeDataText.matchAll(classNameRegex)];
    matches = matches.reverse();
    matches.forEach((match) => {
        var className = match[0];
        var classNameLen = className.length;
        var modName = "igCore";
        for (var i = 0; i < allModules.length; i++) {
            var currName = allModules[i].name;
            var mod = allModules[i].mod;
            if (mod[className]) {
                modName = modName;
            }
        }
        if (platformPrefix == "Igr") {
            if (className.endWith("Component")) {
                className = className.substr(0, className.length - "Component".length);
            }
        }

        codeDataText = codeDataText.substr(0, match.index) + modName + "." + className + input.substr(match.index + classNameLen, input.length - (match.index + classNameLen));
    });

    var helperRegex = new RegExp("CodeGenHelper\\\\.getDescription<([^\\\\]]+)>\\\\(\\"([^\\"]*)\\"\\\\)", "gm");
    console.log(helperRegex);
    console.log(helperRegex.exec(codeDataText));
    codeDataText = codeDataText.replace(helperRegex, 'getDescription("$2")');
    codeDataText = codeDataText.replace(/export class (\w*)/gm, "let $1 = mod.$1 = class $1");

    var code = \`(function () {
        let mod = {};
       
        \${codeDataText}

        return mod;
    })()\`
    var transformed = Babel.transform(code, { filename: 'gen.ts', presets: ['typescript'] });
    var transformedCode = transformed.code;
    var c = eval(transformedCode);
    console.log(c);
    console.log(c[key]);
    return c[key];
}

function loadEventHandler(key, handlerText, allModules) {
    key = toCamel(key);
    var classNameReg = \`\${platformPrefix}\\w+\`;
    var classNameRegex = new RegExp(classNameReg, "g");
    let matches = [...handlerText.matchAll(classNameRegex)];
    matches = matches.reverse();
    matches.forEach((match) => {
        var className = match[0];
        var classNameLen = className.length;
        var modName = "igCore";
        for (var i = 0; i < allModules.length; i++) {
            var currName = allModules[i].name;
            var mod = allModules[i].mod;
            if (mod[className]) {
                modName = modName;
            }
        }
        if (platformPrefix == "Igr") {
            if (className.endWith("Component")) {
                className = className.substr(0, className.length - "Component".length);
            }
        }

        handlerText = handlerText.substr(0, match.index) + modName + "." + className + input.substr(match.index + classNameLen, input.length - (match.index + classNameLen));
    });

    var helperRegex = new RegExp("CodeGenHelper\\\\.getDescription<([^\\\\]]+)>\\\\(\\"([^\\"]*)\\"\\\\)", "gm");
    console.log(helperRegex);
    console.log(helperRegex.exec(handlerText));
    handlerText = handlerText.replace(helperRegex, 'getDescription("$2")');

    var code = \`(function () { return class {
        \${handlerText}
    }})()\`
    var transformed = Babel.transform(code, { filename: 'gen.ts', presets: ['typescript'] });
    var transformedCode = transformed.code;
    var c = eval(transformedCode);
    console.log(c);
    console.log(c.prototype[key]);
    return c.prototype[key];
}



function doExport(platform, code, library, folderTemplate) {
    console.log("exporting: " + platform);
    var o = new igCore.CodeGenerationRendererOptions();
    o.generateFullProject = true;
    o.library = library;

    var p = 0;
    switch (platform) {
        case 'WPF':
            p = 0;
            break;
        case 'Angular':
            p = 1;
            break;
        case 'React':
            p = 2;
            break;
        case 'Web Components':
        case 'WebComponents':
            p = 3;
            break;
        case 'WindowsForms':
            p = 4;
            break;
        case 'Blazor':
            p = 5;
            break;
    }
    var gen = new igCore.CodeGeneratingComponentRenderer(p, o);
    for (var key in igCore) {
        if (key.indexOf("DescriptionModule") >= 0) {
            igCore[key].register(gen.context);
        }
    }
    
    var exporter = new Exporter(igCore.CodeGeneratingImportManager);
    exporter.loadTemplateFromJson(folderTemplate);
    
    var patching = false;
    if (!window.$oldSetProp) {
        window.$oldSetProp = igCore.CodeGenerationRendererAdapter.prototype.setPropertyValue;
        window.$oldSetOrUpdate = igCore.CodeGenerationRendererAdapter.prototype.setOrUpdateCollectionOnTarget;
        
        patching = true;
    }

    var toCamel = (val) => {
        if (val == null) {
			return null;
		}
		return val.substr(0, 1).toLowerCase() + val.substr(1);
    };

    if (patching) {
        //TODO: remove all these patches when the issue is fixed in prod.
        var patched = function (target, propertyName, propertyMetadata, value, oldValue, sourceRef) {
            if (target && target.$type && target.$type.name != 'CodeGenerationItemBuilder') {
                window.$oldSetProp.call(this, target, toCamel(propertyName), propertyMetadata, value, oldValue, sourceRef);
                return;
            }
            window.$oldSetProp.call(this, target, propertyName, propertyMetadata, value, oldValue, sourceRef);
        };
        var patchedSetOrUpdate = function (container, propertyName, propertyMetadata, context, target, value) {
            let currVal = this.getPropertyValue(target, propertyName);
            if (currVal == null) {
                let coll = new igCore.List$1(igCore.Base.$type, 0);
                let arr = value;
                for (let j = 0; j < arr.length; j++) {
                    coll.add1(arr[j]);
                }
                this.setPropertyValue(target, propertyName, propertyMetadata, coll, null, null);
            }
            else {
                let arr = value;
                let coll = currVal;
                coll.clear();
                for (let m = 0; m < arr.count; m++) {
                    coll.add1(arr[m]);
                }
            }
        };
        igCore.CodeGenerationRendererAdapter.prototype.setPropertyValue = patched;
        igCore.CodeGenerationRendererAdapter.prototype.setOrUpdateCollectionOnTarget = patchedSetOrUpdate;


        igCore.CodeGeneratingComponentRenderer.prototype.by = function (color) {
            var b = new igCore.Brush();
            b.fill = color;
            return b.color;
        }

        igCore.CodeGeneratingComponentRenderer.prototype.bx = function (color) {
            var b = new igCore.Brush();
            b.fill = color;
            return b;
        }
    }

    gen.loadCodeJson(code);
    gen.emitCode(exporter);

    //console.log(exporter);
    exporter.download();
}
    `;

    private _contentTemplate: string = `
    <!DOCTYPE html>

    <html lang="en" xmlns="http://www.w3.org/1999/xhtml">
    <head>
        <meta charset="utf-8" />
        <title></title>
    
        <style>
            html, body, #contentArea {
                height: 100%;
                width: 100%;
                margin: 0px;
                padding: 0px;
                
            }
    
            #contentArea {
                display: grid;
                grid-template-rows: auto auto minmax(0, 1fr);
                grid-template-columns: minmax(0, 100%);
            }

            #editor {
                grid-row: 1;
            }

            #legend {
                grid-row: 2;
            }
    
            #content {
                grid-row: 3;
            }
    
            html, body {
                overflow: hidden;
            }
        </style>
        <link rel="stylesheet" type="text/css" href="https://unpkg.com/igniteui-webcomponents@3.1.0/themes/light/bootstrap.css" />
    </head>
    <body>
        <div id="contentArea">
            <igc-component-renderer-container id="editor"></igc-component-renderer-container>
            <igc-component-renderer-container id="legend"></igc-component-renderer-container>
            <igc-component-renderer-container id="content"></igc-component-renderer-container>
        </div>
    
        <script src="Exporter.js"></script>
        <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
        <script defer src="https://unpkg.com/es-module-shims@0.9.0/dist/es-module-shims.js"></script>
        <script type="importmap-shim">
            {
            "imports": {
            "igniteui-webcomponents-charts": "{{root}}/igniteui-webcomponents-charts{{version}}/fesm2015/igniteui-webcomponents-charts.js",
            "igniteui-webcomponents-core": "{{root}}/igniteui-webcomponents-core{{version}}/fesm2015/igniteui-webcomponents-core.js",
            "igniteui-webcomponents-inputs": "{{root}}/igniteui-webcomponents-inputs{{version}}/fesm2015/igniteui-webcomponents-inputs.js",
            "igniteui-webcomponents-layouts": "{{root}}/igniteui-webcomponents-layouts{{version}}/fesm2015/igniteui-webcomponents-layouts.js",
            "igniteui-webcomponents-grids": "{{root}}/igniteui-webcomponents-grids{{version}}/fesm2015/igniteui-webcomponents-grids.js",
            "igniteui-webcomponents-gauges": "{{root}}/igniteui-webcomponents-gauges{{version}}/fesm2015/igniteui-webcomponents-gauges.js",
            "igniteui-webcomponents": "https://unpkg.com/igniteui-webcomponents@3.1.0/index.js?module",
            "lit-html": "https://unpkg.com/lit-html@2.2.0/lit-html.js"
            }
            }
        </script>
        <script type="module-shim">
            

            import * as igCore from 'igniteui-webcomponents-core';
            import * as igCharts from 'igniteui-webcomponents-charts';
            import * as igGauges from 'igniteui-webcomponents-gauges';
            import * as igGrids from 'igniteui-webcomponents-grids';
            import * as igInputs from 'igniteui-webcomponents-inputs';
            import * as igLayouts from 'igniteui-webcomponents-layouts';
            import * as igWC from 'igniteui-webcomponents';
    
            console.log("initializing surface");

            igWC.defineAllComponents();
    
            var allModules = [{
                name: "igCore",
                mod: igCore
                },
                {
                name: "igCharts",
                mod: igCharts
                }, {
                name: "igGrids",
                mod: igGrids
                }, {
                name: "igInputs",
                mod: igInputs
                }, {
                name: "igLayouts",
                mod: igLayouts
                }, {
                name: "igGauges",
                mod: igGauges
                }
            ];

            {{shared}}
    
            var library = null;
            var currJson = "";
            var validator = null;
            var old = igCore.EnumUtil.parse;
            var newParse = function(type, value, ignoreCase) {
            try {
            return old(type, value, ignoreCase);
            } catch (e) {
            return 0;
            }
            };
            igCore.EnumUtil.parse = newParse;
    
            var modules = [];
            for (var key in igCharts) {
            if (key.indexOf("Module") >= 9) {
            if (igCharts[key].register) {
            modules.push(igCharts[key]);
            }
            }
            }
            for (var key in igGrids) {
            if (key.indexOf("Module") >= 9) {
            if (igGrids[key].register) {
            modules.push(igGrids[key]);
            }
            }
            }
            for (var key in igInputs) {
            if (key.indexOf("Module") >= 9) {
            if (igInputs[key].register) {
            modules.push(igInputs[key]);
            }
            }
            }
            for (var key in igLayouts) {
            if (key.indexOf("Module") >= 9) {
            if (igLayouts[key].register) {
            modules.push(igLayouts[key]);
            }
            }
            }
            for (var key in igGauges) {
            if (key.indexOf("Module") >= 9) {
            if (igGauges[key].register) {
            modules.push(igGauges[key]);
            }
            }
            }
    
            igCore.ModuleManager.register.apply(igCore.ModuleManager, modules);
    
    
            var cr = new igCore.ComponentRenderer();
            var cr2 = new igCore.ComponentRenderer();
    
            for (var key in igCore) {
            if (key.indexOf("DescriptionModule") >= 0) {
            igCore[key].register(cr.context);
            igCore[key].register(cr2.context);
            }
            }
    
            //DataChartCategoryDescriptionModule.register(cr.context);
            //PropertyEditorDescriptionModule.register(cr.context);
    
            var cont = document.getElementById("content");
            var editor = document.getElementById("editor");
            var legend = document.getElementById("legend");
            cr.provideRefValue(editor, "renderer", cr2);
    
            window.addEventListener("message", (ev) => {
            console.log("got message");
            console.log(ev);
            if (ev.data && ev.data.type && ev.data.type == "export") {
                doExport(ev.data.platform, currJson, library, ev.data.folderTemplate);
                return;
            }
            if (ev.data.indexOf("setImmediate") >= 0) {
                return;
            }
            currJson = ev.data; 
            cr.loadJson(ev.data, (c) => {
            if (c == "content") {
            return cont;
            }
            if (c == "editor") {
            return editor;
            }
            if (c == "legend") {
            return legend;
            }
            });
            if (validator) {
                var warnings = validator.validate(ev.data);
                top.postMessage({ type: "validationResult", warnings: warnings });
            }
            if (library && cr.getMissingRefs) {
            var missing = cr.getMissingRefs();
            if (missing) {
            for (var i = 0; i < missing.length; i++) {
            console.log("missing: " + missing[i]);
    
            if (library.hasItem(missing[i])) {
            console.log("has item: " + missing[i]);
            var item = library.getItem(missing[i]);
            var content = item.getContentForPlatformString("React");
            if (item.type == igCore.CodeGenerationLibraryItemType.Data) {
            console.log("loading library data");
            //console.log(content);
            if (content.isJson) {
            cr.provideRefValueFromJson(cont, missing[i], content.content);
            } else {
                var DataClass = loadCodeData(missing[i], content.content, allModules);
                var deferredKey = missing[i];
                if (content.isAsync || DataClass.fetch !== undefined) {
                    console.log("content is async");
                    DataClass.fetch().then((d) => {
                        console.log(d);
                        cr.provideRefValue(cont, deferredKey, d);
                    });
                } else {
                    cr.provideRefValue(cont, missing[i], new DataClass());
                }
            }
            }
            if (item.type == igCore.CodeGenerationLibraryItemType.EventHandler) {
            //console.log("here");
            if (content.isJson) {
            console.log("binding library handler");
    
            console.log(content.content);
            var eventHandlerObj = JSON.parse(content.content);
            var handler = loadEventHandler(missing[i], eventHandlerObj.handler, allModules);
            cr.provideRefValue(cont, missing[i], handler);
            }
            }
            }
            }
            }
            }
            });
    
            function finishBoot() {
                console.log("finishing boot");
            top.postMessage({ type: "ready" });
            }
    
            var libraryContent = {{library}};
            var validationContent = {{validation}};
            if (igCore.CodeGenerationLibrary) {
                library =  igCore.CodeGenerationLibrary.fromJson(JSON.stringify(libraryContent));
            
                if (igCore.DescriptionJsonValidator && igCore.DescriptionJsonValidator.fromJson) {
                    validator = igCore.DescriptionJsonValidator.fromJson(JSON.stringify(validationContent));
        
                    finishBoot();
                } else {
                    finishBoot();
                }
            } else {
                finishBoot();
            }
    
        </script>
    </body>
    </html>
    `;

    sendJson(json: string) {
        this._frameElement.contentWindow?.postMessage(json);
    }

    sendExportMessage(platform: string, folderTemplate: string) {
        this._frameElement.contentWindow?.postMessage({ "type": "export", "platform": platform, "folderTemplate": folderTemplate });
    }

    loadSurface(specificVersion?: string) {
        if (!specificVersion) {
            specificVersion = "3.2.3";
        }
        let version = "@" + specificVersion;
        let root = "https://unpkg.com";

        let shared = this._shared.replace(/\{platformPrefix\}/gm, "Igc");

        let libraryContent = JSON.stringify(libraryJson);
        let validationContent = JSON.stringify(validationData);

        let content = this._contentTemplate
        .replace(/\{\{shared\}\}/gm, shared)
        .replace(/\{\{root\}\}/gm, root)
        .replace(/\{\{version\}\}/gm, version)
        .replace(/\{\{library\}\}/gm, libraryContent)
        .replace(/\{\{validation\}\}/gm, validationContent)

       
        const frameDoc =
            this._frameElement.contentWindow;

        frameDoc?.document.write(content);
        frameDoc?.document.close();
    }
}