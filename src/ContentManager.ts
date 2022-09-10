import { IgcDropdownComponent } from 'igniteui-webcomponents';
import * as libraryJson from './data/library.json';
import * as validationData from './data/validationData.json';

export class ContentManager {
    private _frameElement: HTMLIFrameElement;
    private _platformElement: IgcDropdownComponent;
    private _frameContainer: HTMLDivElement;

    constructor (frameContainer: HTMLDivElement, platformElement: IgcDropdownComponent) {
        this._frameContainer = frameContainer;
        this._frameElement = frameContainer.children[0] as HTMLIFrameElement;
        this._platformElement = platformElement;

        this._platformElement.addEventListener("igcChange", (ev) => {
            var item = ev.detail;
            this.onPlatformChanged(item.textContent!);
        });
    }

    private _currentVersion: string | undefined;

    private recreateSurface() {
        if (this._frameElement) {
            this.sendDestroyMessage();
        }
        this._frameElement.remove();
        this._frameElement = document.createElement("iframe");
        this._frameElement.id = "contentFrame";
        this._frameContainer.append(this._frameElement);
    }

    private onPlatformChanged(platform: string) {
        this.recreateSurface();
        this.loadSurface(undefined, platform);
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

    private _reactTemplate: string = `
    <!DOCTYPE html>

<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta charset="utf-8" />
    <title></title>

    <style>
        html, body, #root, .contentArea {
            height: 100%;
            width: 100%;
            margin: 0px;
            padding: 0px;
        }

        .contentArea {
            display: flex;
            flex-direction: column;
            align-items: stretch;
        }

        .content {
            flex-grow: 1
        }

        html, body {
            overflow: hidden;
        }
    </style>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/igniteui-webcomponents@3.1.0/themes/light/bootstrap.css" />
</head>
<body>
    <div id="root">

    </div>

    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script defer src="https://unpkg.com/es-module-shims@0.9.0/dist/es-module-shims.js"></script>
    <script type="importmap-shim">
        {
        "imports": {
        "react": "https://ga.jspm.io/npm:react@18.1.0/dev.index.js",
        "react-dom": "https://ga.jspm.io/npm:react-dom@18.1.0/dev.index.js",
        "scheduler": "https://ga.jspm.io/npm:scheduler@0.22.0/dev.index.js",
        "process": "https://ga.jspm.io/npm:@jspm/core@2.0.0-beta.24/nodelibs/browser/process.js",
        "igniteui-react-core": "{{root}}/igniteui-react-core{{version}}/fesm2015/igniteui-react-core.js",
        "igniteui-react-charts": "{{root}}/igniteui-react-charts{{version}}/fesm2015/igniteui-react-charts.js",
        "igniteui-react-inputs": "{{root}}/igniteui-react-inputs{{version}}/fesm2015/igniteui-react-inputs.js",
        "igniteui-react-layouts": "{{root}}/igniteui-react-layouts{{version}}/fesm2015/igniteui-react-layouts.js",
        "igniteui-react-grids": "{{root}}/igniteui-react-grids{{version}}/fesm2015/igniteui-react-grids.js",
        "igniteui-react-gauges": "{{root}}/igniteui-react-gauges{{version}}/fesm2015/igniteui-react-gauges.js",
        "tslib": "https://unpkg.com/tslib@2.1.0/tslib.js",
        "igniteui-webcomponents": "https://unpkg.com/igniteui-webcomponents@3.1.0/index.js?module",
        "lit-html": "https://unpkg.com/lit-html@2.2.0/lit-html.js"
        }
        }
    </script>

    <script type="module-shim">

        import * as React from 'react';
        import * as ReactDOM from 'react-dom';
        import * as igCore from 'igniteui-react-core';
        import * as igCharts from 'igniteui-react-charts';
        import * as igGrids from 'igniteui-react-grids';
        import * as igInputs from 'igniteui-react-inputs';
        import * as igLayouts from 'igniteui-react-layouts';
        import * as igGauges from 'igniteui-react-gauges';
        import * as igWC from 'igniteui-webcomponents';

                igWC.defineAllComponents();

                {{shared}}

                var cont = null;
                var editor = null;
                var legend = null;
                var library = null;
                var validator = null;

                var listen = (ev) => {
                    //console.log(ev);
                    if (ev.data && ev.data.type && ev.data.type == "export") {
                        doExport(ev.data.platform, currJson, library, ev.data.folderTemplate);
                        return;
                    }
                    if (ev.data && ev.data.type && ev.data.type == "destroy") {
                        console.log("destroying surface");
                        window.removeEventListener("message", listen)
                        return;
                    }
                    if (ev.data && ev.data.indexOf && ev.data.indexOf("setImmediate") >= 0) {
                        return;
                    }
                    if (!ev.data || !(typeof ev.data == "string")) {
                        return;
                    }

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
                };

                var old = igCore.EnumUtil.parse;
                var newParse = function (type, value, ignoreCase) {
                    try {
                        return old(type, value, ignoreCase);
                    } catch (e) {
                        return 0;
                    }
                };
                console.log(igCore);
                console.log(igCharts);
                igCore.EnumUtil.parse = newParse;

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
                for (var i = 0; i < modules.length; i++) {
                    modules[i].register();
                }

                var cr = new igCore.ComponentRenderer();
                var cr2 = new igCore.ComponentRenderer();

                for (var key in igCore) {
                    if (key.indexOf("DescriptionModule") >= 0) {
                        igCore[key].register(cr.context);
                        igCore[key].register(cr2.context);
                    }
                }

                function finishBoot() {
                    //var cont = document.getElementById("content");
                    //var editor = document.getElementById("editor");
                    cr.provideRefValue(editor, "renderer", cr2);

                    window.addEventListener("message", listen);
                    top.postMessage({ type: "ready" });
                }

                function bootup() {
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
                }



                function onContRef(e) {
                    cont = e;
                    if (cont && editor && legend) {
                        bootup();
                    }
                }
                function onEditorRef(e) {
                    editor = e;
                    if (cont && editor && legend) {
                        bootup();
                    }
                }
                function onLegendRef(e) {
                    legend = e;
                    if (cont && editor && legend) {
                        bootup();
                    }
                }

                var root = document.getElementById("root");
                var contEle = React.createElement(igCore.IgrComponentRendererContainer, { ref: onContRef });
                var contDiv = React.createElement("div", { className: "content", children: [contEle] });
                var editorEle = React.createElement(igCore.IgrComponentRendererContainer, { ref: onEditorRef });
                var editorDiv = React.createElement("div", { className: "editor", children: [editorEle] });
                var legendEle = React.createElement(igCore.IgrComponentRendererContainer, { ref: onLegendRef });
                var legendDiv = React.createElement("div", { className: "legend", children: [legendEle] });
                var container = React.createElement("div", { className: "contentArea", children: [editorDiv, legendDiv, contDiv] });

                ReactDOM.render(
                    container,
                    root);
    </script>
</body>
</html>
    `;

    private _angularTemplate: string = `
    <!DOCTYPE html>

<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta charset="utf-8" />
    <title></title>

    <style>
        html, body, #contentArea, my-app {
            height: 100%;
            width: 100%;
            margin: 0px;
            padding: 0px;
            
        }

        #contentArea {
            display: flex;
            flex-direction: column;
            align-items: stretch;
        }

        #content {
            flex-grow: 1
        }

        #content > igx-component-renderer-container {
            height: 100%;
        }

        html, body {
            overflow: hidden;
        }
    </style>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/igniteui-webcomponents@3.1.0/themes/light/bootstrap.css" />
</head>
<body>
    <my-app></my-app>

    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script defer src="https://unpkg.com/es-module-shims@0.9.0/dist/es-module-shims.js"></script>
    <script type="importmap-shim">
     {
            "imports": {
            "tslib": "https://unpkg.com/tslib@2.4.0/tslib.es6.js",
            "rxjs": "https://unpkg.com/rxjs@7.4.0/dist/esm/index.js",
            "rxjs/operators": "https://unpkg.com/rxjs@7.4.0/dist/esm/operators/index.js",
            "zone.js": "https://unpkg.com/zone.js@0.11.4/bundles/zone.umd.js",
            "@angular/common": "https://unpkg.com/@angular/common@14.2.1/fesm2015/common.mjs",
    		"@angular/compiler": "https://unpkg.com/@angular/compiler@14.2.1/fesm2015/compiler.mjs",
    		"@angular/core": "https://unpkg.com/@angular/core@14.2.1/fesm2015/core.mjs",
            "@angular/platform-browser": "https://unpkg.com/@angular/platform-browser@14.2.1/fesm2015/platform-browser.mjs",
            "@angular/platform-browser-dynamic": "https://unpkg.com/@angular/platform-browser-dynamic@14.2.1/fesm2015/platform-browser-dynamic.mjs",
            "igniteui-angular-charts": "{{root}}/igniteui-angular-charts{{version}}/fesm2015/igniteui-angular-charts.js",
            "igniteui-angular-core": "{{root}}/igniteui-angular-core{{version}}/fesm2015/igniteui-angular-core.js",
            "igniteui-angular-inputs": "{{root}}/igniteui-angular-inputs{{version}}/fesm2015/igniteui-angular-inputs.js",
            "igniteui-angular-layouts": "{{root}}/igniteui-angular-layouts{{version}}/fesm2015/igniteui-angular-layouts.js",
            "igniteui-angular-grids": "{{root}}/igniteui-angular-grids{{version}}/fesm2015/igniteui-angular-grids.js",
            "igniteui-angular-gauges": "{{root}}/igniteui-angular-gauges{{version}}/fesm2015/igniteui-angular-gauges.js",
            "igniteui-webcomponents": "https://unpkg.com/igniteui-webcomponents@3.1.0/index.js?module",
            "lit-html": "https://unpkg.com/lit-html@2.2.0/lit-html.js"
 		}
     }
    </script>
    <script type="module-shim">
        import 'zone.js';
        import "@angular/compiler";
        import { __decorate, __asyncGenerator, __metadata } from 'tslib';
        import { Component, ViewChild, NgModule } from '@angular/core';
        //import { platfromBrowserDynamic } from '@angular/platform-browser-dynamic';
        import * as pb from '@angular/platform-browser';
        import * as pbd from '@angular/platform-browser-dynamic';
        import * as igCore from 'igniteui-angular-core';
        import * as igCharts from 'igniteui-angular-charts';
        import * as igGauges from 'igniteui-angular-gauges';
        //import * as igGrids from 'igniteui-angular-grids';
        //import * as igInputs from 'igniteui-angular-inputs';
        import * as igLayouts from 'igniteui-angular-layouts';
        import * as igWC from 'igniteui-webcomponents';

        igWC.defineAllComponents();

        {{shared}}

        var library = null;
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

        var allModules = [{
            name: "igCore",
            mod: igCore
            },
            {
            name: "igCharts",
            mod: igCharts
            },
            //{
            //name: "igGrids",
            //mod: igGrids
            //},
            //{
            //name: "igInputs",
            //mod: igInputs
            //},
             {
            name: "igLayouts",
            mod: igLayouts
            }, {
            name: "igGauges",
            mod: igGauges
            }
        ];

        var modules = [];
        for (var key in igCharts) {
        if (key.indexOf("DynamicModule") >= 9) {
        //if (igCharts[key].register) {
        modules.push(igCharts[key]);
        //}
        }
        }
        //for (var key in igGrids) {
        //if (key.indexOf("Module") >= 9) {
        //if (igGrids[key].register) {
        //modules.push(igGrids[key]);
        //}
        //}
        //}
        //for (var key in igInputs) {
        //if (key.indexOf("DynamicModule") >= 9) {
        //if (igInputs[key].register) {
        //modules.push(igInputs[key]);
        //}
        //}
        //}
        for (var key in igLayouts) {
        if (key.indexOf("DynamicModule") >= 9) {
        //if (igLayouts[key].register) {
        modules.push(igLayouts[key]);
        //}
        }
        }
        for (var key in igGauges) {
        if (key.indexOf("DynamicModule") >= 9) {
        //if (igGauges[key].register) {
        modules.push(igGauges[key]);
        //}
        }
        }

        modules.push(igCore.IgxComponentRendererContainerModule);

        //igCore.ModuleManager.register.apply(igCore.ModuleManager, modules);


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

        var cont; // = document.getElementById("content");
        var editor; // = document.getElementById("editor");
        var legend; // = document.getElementById("legend");
        var listen = (ev) => {
            if (ev.data && ev.data.type && ev.data.type == "export") {
                doExport(ev.data.platform, currJson, library, ev.data.folderTemplate);
                return;
            }
            if (ev.data && ev.data.type && ev.data.type == "destroy") {
                console.log("destroying surface");
                window.removeEventListener("message", listen)
                return;
            }
            if (ev.data && ev.data.indexOf && ev.data.indexOf("setImmediate") >= 0) {
                return;
            }
            if (!ev.data || !(typeof ev.data == "string")) {
                return;
            }
        //console.log(ev);
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
        var content = item.getContentForPlatformString("Angular");
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
        };

        window.addEventListener("message", listen);

        function finishBoot() {
            if (cont && fetchedAssets) {
                console.log("finishing angular boot");
                cr.provideRefValue(editor, "renderer", cr2);

                top.postMessage({ type: "ready" });
            }
        }

        var fetchedAssets = false;

        var libraryContent = {{library}};
        var validationContent = {{validation}};
        if (igCore.CodeGenerationLibrary) {
            library =  igCore.CodeGenerationLibrary.fromJson(JSON.stringify(libraryContent));
        
            if (igCore.DescriptionJsonValidator && igCore.DescriptionJsonValidator.fromJson) {
                validator = igCore.DescriptionJsonValidator.fromJson(JSON.stringify(validationContent));
    
                fetchedAssets = true;
                finishBoot();
            } else {
                fetchedAssets = true;
                finishBoot();
            }
        } else {
            fetchedAssets = true;
            finishBoot();
        }

        class MainComponent {
            _editor = null;
            _legend = null;
            _content = null;

            ngAfterViewInit() {
                editor = this._editor;
                legend = this._legend;
                cont = this._content;
                finishBoot();
            }
        }
        __decorate([
            ViewChild("content", { static: false }),
            __metadata("design:type", Object)
        ], MainComponent.prototype, "_content", void 0);
        __decorate([
            ViewChild("legend", { static: false }),
            __metadata("design:type", Object)
        ], MainComponent.prototype, "_legend", void 0);
        __decorate([
            ViewChild("editor", { static: false }),
            __metadata("design:type", Object)
        ], MainComponent.prototype, "_editor", void 0);
        MainComponent = __decorate([
            Component({
              selector: 'my-app',
              template: \`
                <div id="contentArea">
                    <igx-component-renderer-container #editor></igx-component-renderer-container>
                    <igx-component-renderer-container #legend></igx-component-renderer-container>
                    <div id="content">
                        <igx-component-renderer-container #content></igx-component-renderer-container>
                    </div>
                </div>
              \`,
            })
        ], MainComponent);

        const { BrowserModule } = pb;

        class AppModule { }

        console.log(igCore);
        console.log(modules);
        let mods = [ ...modules, BrowserModule ]
        console.log(mods);

        AppModule = __decorate([
            NgModule({
               imports:      mods,
                declarations: [ MainComponent ],
                bootstrap:    [ MainComponent ]
            })
        ], AppModule);

        //console.log(pbd);
        pbd.platformBrowserDynamic().bootstrapModule(AppModule);

    </script>
</body>
</html>
    `;

    private _wcContentTemplate: string = `
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
    
            var listen = (ev) => {
                console.log("got message");
                console.log(ev);
                if (ev.data && ev.data.type && ev.data.type == "export") {
                    doExport(ev.data.platform, currJson, library, ev.data.folderTemplate);
                    return;
                }
                if (ev.data && ev.data.type && ev.data.type == "destroy") {
                    console.log("destroying surface");
                    window.removeEventListener("message", listen)
                    return;
                }
                if (ev.data && ev.data.indexOf && ev.data.indexOf("setImmediate") >= 0) {
                    return;
                }
                if (!ev.data || !(typeof ev.data == "string")) {
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
                };

            window.addEventListener("message", listen);
    
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

    sendDestroyMessage() {
        this._frameElement.contentWindow?.postMessage({ "type": "destroy" });
    }

    loadSurface(specificVersion?: string, platform?: string) {
        
        if (!platform) {
            platform = "Web Components";
        }
        if (!specificVersion) {
            if (platform == "Web Components") {
                specificVersion = "3.2.3";
            } else if (platform == "Angular") {
                specificVersion = "14.1.1";
            } else if (platform == "React") {
                specificVersion = "16.16.3";
            }
        }
        this._currentVersion = specificVersion;

        let version = "@" + specificVersion;
        let root = "https://unpkg.com";

        let shared = this._shared.replace(/\{platformPrefix\}/gm, "Igc");

        let libraryContent = JSON.stringify(libraryJson);
        let validationContent = JSON.stringify(validationData);

        let template = this._wcContentTemplate;

        if (platform == "Angular") {
            template = this._angularTemplate;
            shared = this._shared.replace(/\{platformPrefix\}/gm, "Igx");
        }
        if (platform == "React") {
            template = this._reactTemplate;
            shared = this._shared.replace(/\{platformPrefix\}/gm, "Igr");
        }

        let content = template
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