import { DataChartDescription } from 'igniteui-webcomponents-core';
import { EditorManager } from './EditorManager';
import * as schemaJson from "./data/igSchema.json";
import { ContentManager } from './ContentManager';



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