import JSZip from 'jszip';
import FileSaver from 'file-saver';

class CodeGeneratingRegexHelper {
    private _pattern: RegExp;

    public constructor(pattern: string)
    {
        this._pattern = new RegExp(pattern, "gm");
    }

    public execute(input: string, onMatch: (arg1: (arg1: number) => string, arg2: number, arg3: number) => string | null): string {
        var matches = input.matchAll(this._pattern);
        if (matches != null)
        {
            let matchesList: RegExpMatchArray[] = [];
            for (const match of matches) {
                matchesList.push(match);
            }
            matchesList.reverse();
            if (matchesList.length == 0) {
                return input;
            }

            for (let m of matchesList)
            {
                let getGroup = (i: number): string =>
                {
                    return m[i];
                };
                var start = m.index!;
                var length = m[0].length;
                var newValue = onMatch(getGroup, start, length);
                if (newValue != null)
                {
                    if (newValue.length == 0)
                    {                         
                        var ind = start - 1;
                        while (ind > 0)
                        {
                            if (input[ind] == '\n' ||
                                (input[ind] != ' ' &&
                                input[ind] != '\t'))
                            {
                                if (input[ind] == '\n')
                                {
                                    if (ind > 0)
                                    {
                                        if (input[ind] == '\r')
                                        {
                                            ind--;
                                            length++;
                                        }
                                    }
                                }
                                else
                                {
                                    ind++;
                                    length--;
                                }
                                break;
                            }

                            length++;
                            ind--;
                        }
                        start = ind;
                    }

                    if (start < 0)
                    {
                        start = 0;
                    }

                    var before = input.substr(0, start);
                    var after = input.substr(start + length, input.length - (start + length));
                    input = before + newValue + after;
                }
            }
        }
    return input;

    }
}


export class Exporter {
    private ImportManager: any;
    constructor(importManager: any) {
        this.ImportManager = importManager;
    }
	private _filePaths: string[] = [];
	private _fileContents: string[] = [];
	private _fileOutputs: string[] = [];
	addFile(relativePath: string, templateFileContent: string): void {
		this._filePaths.push(relativePath);
		this._fileContents.push(templateFileContent);
	}
	getFilePaths(): string[] {
		return this._filePaths;
	}
	getFileOuutput(relativePath: string): string | null {
		for (let i = 0; i < this._filePaths.length; i++) {
			if (this._filePaths[i] == relativePath) {
				return this._fileOutputs[i];
			}
		}
		return null;
	}
	
	loadTemplateFromJson(jsonTemplate: string): void {
		var obj = JSON.parse(jsonTemplate);
        if (obj.files) {
            for (let i = 0; i < obj.files.length; i++) {
                let item = obj.files[i];
                if (item) {
                    if (item.path && item.content) {
                        this._filePaths.push(item.path);
                        this._fileContents.push(item.content);
                    }
                }
            }
        }
	}


    private stringReplace(str: string, oldValue: string, newValue: string): string {
        return str.replace(new RegExp(this.stringEscapeRegExp(oldValue), "g"), newValue);
    }

    private stringEscapeRegExp(str: string): string {
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    }

    private stringStartsWith(str: string, check: string): boolean {
        return str.indexOf(check) == 0;
    }

	execute(result: any): void {
		this._fileOutputs.length = 0;
		for (let i = 0; i < this._fileContents.length; i++) {
			this._fileOutputs.push(this._fileContents[i]);
		}
		let keys = result.getKeys();
		let keyHash = new Set<string>();
		for (let i1 = 0; i1 < keys.length; i1++) {
			keyHash.add(keys[i1]);
		}
		let impKeys = result.getImportsKeys();
		for (let i2 = 0; i2 < impKeys.length; i2++) {
			keyHash.add(impKeys[i2]);
		}
		let strKeys = result.getStringNames();
		for (let i3 = 0; i3 < strKeys.length; i3++) {
			keyHash.add(strKeys[i3]);
		}
		let packages = result.getPackages();
		for (let i4 = 0; i4 < packages.length; i4++) {
			keyHash.add(packages[i4]);
		}
		for (let i5 = 0; i5 < this._fileContents.length; i5++) {
			let currOutput = this._fileOutputs[i5];
			currOutput = this.removeUndefinedSections(currOutput, keyHash);
			this._fileOutputs[i5] = currOutput;
		}
		for (let i6 = 0; i6 < this._fileContents.length; i6++) {
			let importsKeys: string[] = [];
			let $t = result.getImportsKeys();
			for (let i7 = 0; i7 < $t.length; i7++) {
				let key = $t[i7];
				importsKeys.push(key);
			}
			let currOutput1 = this._fileOutputs[i6];
			currOutput1 = this.replaceImports(currOutput1, importsKeys, result);
			this._fileOutputs[i6] = currOutput1;
		}
		let $t1 = result.getKeys();
		for (let i8 = 0; i8 < $t1.length; i8++) {
			let key1 = $t1[i8];
			for (let i9 = 0; i9 < this._fileContents.length; i9++) {
				let currOutput2 = this._fileOutputs[i9];
				let content = result.getContentForKey(key1);
				currOutput2 = this.replaceContent(currOutput2, key1, content, result);
				this._fileOutputs[i9] = currOutput2;
			}
		}
		let $t2 = result.getStringNames();
		for (let i10 = 0; i10 < $t2.length; i10++) {
			let key2 = $t2[i10];
			for (let i11 = 0; i11 < this._fileContents.length; i11++) {
				let currOutput3 = this._fileOutputs[i11];
				currOutput3 = this.stringReplace(currOutput3, "$$" + key2, result.getString(key2));
				this._fileOutputs[i11] = currOutput3;
			}
		}
        var newFiles = result.getNewFiles();
		for (var j = 0; j < newFiles.count; j++) {
            let newFile = newFiles.item(j);
			let content1 = result.getNewFileContent(newFile);
			let preferredRoot: string = "";
			for (let file of this._filePaths) {
				if (this.stringStartsWith(file, "src")) {
					preferredRoot = "src/";
				}
			}
			this._filePaths.push(preferredRoot + newFile);
			this._fileOutputs.push(content1);
		}
	}
	private removeUndefinedSections(currOutput: string, keyHash: Set<string>): string {
        var startRegex = new RegExp(/(?:(<!--)|(\/\/))\s*ifdef ([\w ,]+?)(?:(\s*-->)?)\r?\n((?!(?:(<!--)|(\/\/))\s*(?:endifdef \3))[\w\W\r\n]*?)(?:(<!--)|(\/\/))\s*(?:endifdef \3)+?(?:(\s*-->)?)((\r\n)|(\n))/gm);
        var matches = currOutput.matchAll(startRegex);
        if (matches != null)
        {
            let matchesList: RegExpMatchArray[] = [];
            for (var m of matches)
            {
                matchesList.push(m);
            }
            matchesList.reverse();
            if (matchesList.length == 0) {
                return currOutput;
            }

            for (var m of matchesList)
            {
                var key = m[3];
                var keys: string[] = [];
                if (key.indexOf(",") >= 0)
                {
                    var vals = key.split(',');
                    for (var i = 0; i < vals.length; i++)
                    {
                        keys.push(vals[i].trim());
                    }
                }
                else
                {
                    keys.push(key.trim());
                }

                var foundMatch = false;
                for (var subkey of keys)
                {
                    if (keyHash.has(subkey))
                    {
                        foundMatch = true;
                    }
                }

                if (!foundMatch)
                {
                    var start = m.index!;
                    var len = m[0].length;
                    currOutput = currOutput.substr(0, start) + currOutput.substr(start + len, currOutput.length - (start + len));
                }
                else
                {
                    var insertion = m[5];
                    insertion = insertion.trimStart();
                    //insertion = insertion.TrimEnd(new char[] { '\r', '\n', '\t', ' ' });
                    var start1 = m.index!;
                    var len1 = m[0].length;
                    currOutput = currOutput.substr(0, start1) + insertion + currOutput.substr(start1 + len1, currOutput.length - (start1 + len1));
                }
            }
        }

        return currOutput;
	}
	private replaceImports(currOutput: string, importKeys: string[], result: any): string {
		let importsList: { index: number, content: string, manager: any }[] = [];
        let importDic: any = null;
        for (var key of Object.keys(result)) {
            var val = result[key];
            if (val && val.$type) {
                if (val.$type.name == "Dictionary$2") {
                    if (val.$tValue && val.$tValue.name == "List$1") {
                        if (val.$tValue.typeArguments[0].name == "CodeGeneratingImportManager") {
                            importDic = val;
                        }
                    }
                }
            }
        }

		for (let i = 0; i < importKeys.length; i++) {
			let key = importKeys[i];
			let startRegex = new CodeGeneratingRegexHelper("(?:(<!--)|(\\/\\/))\\s*insert " + key + "(?:(\\s*-->)?)[\\w\\W\\r\\n]*?(?:(<!--)|(\\/\\/))\\s*end " + key + "(?:(\\s*-->)?)((\\r\\n)|(\\n))");
			currOutput = startRegex.execute(currOutput, (getGroups: (arg1: number) => string, start: number, length: number): string | null => {
				let imps = importDic!.item(key);
				let collected: any = new this.ImportManager();
				for (var i = 0; i < imps.count; i++) {
                    let im  = imps.item(i);
					collected = this.ImportManager.merge(collected, im);
				}
				importsList.push({ index: start, content: key, manager: collected});
				return null;
			});
		}
        importsList.sort((a, b) => {
            return a.index - b.index;
        })
		let combined = new this.ImportManager();
		for (var i = 0; i < importsList.length; i++) {
            let imp = importsList[i];
			let key1 = imp.content;
			let imps = imp.manager;
			let toWrite = imps.removeDuplicates(combined);
			combined = this.ImportManager.merge(combined, imps);
			let startRegex1 = new CodeGeneratingRegexHelper("(?:(<!--)|(\\/\\/))\\s*insert " + key1 + "(?:(\\s*-->)?)[\\w\\W\\r\\n]*?(?:(<!--)|(\\/\\/))\\s*end " + key1 + "(?:(\\s*-->)?)((\\r\\n)|(\\n))");
			currOutput = startRegex1.execute(currOutput, (getGroups: (arg1: number) => string, start: number, length: number) => {
				let content = this.getImportsContent(toWrite, result);
				if (content != null && content.length > 0) {
					content = this.adjustContentTabbing(content, currOutput, start, result);
				}
				return content;
			});
		}
		return currOutput;
	}
	private adjustContentTabbing(content: string, currOutput: string, start: number, result: any): string {
		let ind = start;
		let numTabs: number = 0;
		let numSpaces: number = 0;
		let baseIndent = "";
		while (ind > 0) {
			if (currOutput.charAt(ind) == ' ') {
				baseIndent += ' ';
			}
			if (currOutput.charAt(ind) == '\t') {
				baseIndent += '\t';
			}
			if (currOutput.charAt(ind) == '\n') {
				break;
			}
			ind--;
		}
		let newContent: string = "";
		let lines = this.stringReplace(content, "\r\n", "\n").split('\n');
		for (let i = 0; i < lines.length; i++) {
			if (i == lines.length - 1 && lines[i].length == 0) {
				continue;
			}
			let line = lines[i];
			if (i > 0) {
				newContent += (baseIndent);
			}
			newContent += (line) + "\r\n";
		}
		return newContent.toString();
	}
	private getImportsContent(toWrite: any, result: any): string {
		if (toWrite.hasPackageImports) {
			return toWrite.packageImportsToString();
		} else {
			return toWrite.usingsToString();
		}
	}
	private replaceContent(currOutput: string, key: string, content: string, result: any): string {
		let startRegex = new CodeGeneratingRegexHelper("(?:(<!--)|(\\/\\/))\\s*insert " + key + "(?:(\\s*-->)?)[\\w\\W\\r\\n]*?(?:(<!--)|(\\/\\/))\\s*end " + key + "(?:(\\s*-->)?)((\\r\\n)|(\\n))");
		currOutput = startRegex.execute(currOutput, (getGroups: (arg1: number) => string, start: number, length: number) => {
			if (content != null && content.length > 0) {
				content = this.adjustContentTabbing(content, currOutput, start, result);
			}
			return content;
		});
		return currOutput;
	}

    public download() {
        const zip = new JSZip();
        
        for (var i = 0; i < this._fileOutputs.length; i++) {
            zip.file(this._filePaths[i], this._fileOutputs[i]);
        }

        zip.generateAsync({ type: 'blob' }).then(function (content) {
            FileSaver.saveAs(content, 'download.zip');
        });
    }
}

(window as any).Exporter = Exporter;