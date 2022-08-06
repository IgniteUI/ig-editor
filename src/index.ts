import { DataChartDescription } from 'igniteui-webcomponents-core';
import { EditorManager } from './EditorManager';
import * as schemaJson from "./data/igSchema.json";
import { ContentManager } from './ContentManager';

import 'igniteui-webcomponents/themes/dark/bootstrap.css'
import { defineAllComponents, IgcDropdownComponent } from 'igniteui-webcomponents';
import { ExportManager } from './ExportManager';

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

let contentFrame = document.getElementById("contentFrame");

let contentManager = new ContentManager(contentFrame as HTMLIFrameElement);
contentManager.loadSurface();

let urlParams = new URLSearchParams(window.location.search);
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

let manager = new ExportManager(exportElement, editorManager, contentManager);