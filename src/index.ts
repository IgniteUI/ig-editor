import { DataChartDescription } from 'igniteui-webcomponents-core';
import { EditorManager } from './EditorManager';
import * as schemaJson from "./ig-editor-lib/src/data/igSchema.json";
import { ContentManager } from './ig-editor-lib/src/ContentManager';

import 'igniteui-webcomponents/themes/dark/bootstrap.css'
import { defineAllComponents, IgcDropdownComponent } from 'igniteui-webcomponents';
import { ExportManager } from './ig-editor-lib/src/ExportManager';

defineAllComponents();

console.log("test");



let editorContainer = document.getElementById("container")!;
console.log(editorContainer);

let editorManager = new EditorManager(editorContainer);
editorManager.loadEditors(schemaJson);

editorManager.onEditorChanged = (newContent) => {
    if (contentManager) {
        contentManager.sendJson(newContent);
    }
}

let frameContainer = document.getElementById("frameContainer");
let contentFrame = document.getElementById("contentFrame");

var platformElement = document.getElementById("platform") as IgcDropdownComponent;

let contentManager = new ContentManager(frameContainer as HTMLDivElement, platformElement);
contentManager.loadSurface();

let urlParams = new URLSearchParams(window.location.search);
if (urlParams.has("editorHidden")) {
    let myParam = urlParams.get('editorHidden')!;
    if (myParam != "false") {
        editorContainer.style.display = "none";
        document.getElementById("topBar")!.style.display = "none";
        frameContainer!.style.gridRowStart = "1";
        frameContainer!.style.gridRowEnd = "3";
        frameContainer!.style.gridColumnStart = "1";
        frameContainer!.style.gridColumnEnd = "3";
    }
}
document.getElementById("allContent")!.style.display = "block";

if (urlParams.has("github")) {
    let myParam = urlParams.get('github')!;
    myParam = "https://raw.githubusercontent.com/" + myParam;
    fetch(myParam).then((res) => {
        res.text().then(txt => {
            editorManager.updateContent(txt);
        });
    });
}
if (urlParams.has("gist")) {
    let myParam = urlParams.get('gist')!;
    myParam = "https://gist.githubusercontent.com/" + myParam;
    fetch(myParam).then((res) => {
        res.text().then(txt => {
            editorManager.updateContent(txt);
        });
    });
}

var exportElement = document.getElementById("export") as IgcDropdownComponent;

let manager = new ExportManager(exportElement, contentManager);

window.addEventListener("message", (ev) => {
    var msg = ev.data;
    if (msg && msg.type == "editorJson") {
        editorManager.updateContent(msg.editorJson);
    };
});

if (window.parent) {
    window.parent.postMessage({
        type: "editorReady"
    });
}