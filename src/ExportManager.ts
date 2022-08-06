import { IgcDropdownComponent } from "igniteui-webcomponents";
import { CodeGeneratingComponentRenderer, CodeGenerationRendererOptions, CodeGenerationTargetPlatforms } from "igniteui-webcomponents-core";
import { ContentManager } from "./ContentManager";
import { EditorManager } from "./EditorManager";
import WPF from './data/templates/WPF.json';
import WebComponents from './data/templates/WebComponents.json';
import Blazor from './data/templates/Blazor.json';
import React from './data/templates/React.json';
import Angular from './data/templates/Angular.json';

export class ExportManager {
    private _exportElement: IgcDropdownComponent;
    private _editorManager: EditorManager;
    private _contentManager: ContentManager;

    public constructor(exportElement: IgcDropdownComponent, editorManager: EditorManager, contentManager: ContentManager) {
        this._exportElement = exportElement;
        this._exportElement.addEventListener("igcChange", (ev) => {
            var item = ev.detail;
            this.onExport(item.textContent!);
        });
        this._editorManager = editorManager;
        this._contentManager = contentManager;
    }

    private onExport(platform: string) {
        console.log("exporting: " + platform);

        var folderTemplate = "";
        switch (platform) {
            case 'WPF':
                folderTemplate = JSON.stringify(WPF);
                break;
            case 'WebComponents':
            case 'Web Components':
                folderTemplate = JSON.stringify(WebComponents);
                break;
            case 'Angular':
                folderTemplate = JSON.stringify(Angular);
                break;
            case 'Blazor':
                folderTemplate = JSON.stringify(Blazor);
                break;
            case 'React':
                folderTemplate = JSON.stringify(React);
        }
        this._contentManager.sendExportMessage(platform, folderTemplate);
    }
}