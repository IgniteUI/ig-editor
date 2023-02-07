const fs = require("fs");

let distFolder = "./dist";
let indexFile = "./src/index.html";
let revealFrame = "./src/revealFrame.html";

let file = fs.readFileSync(indexFile).toString();
let other = fs.readFileSync(revealFrame).toString();

let scripts = ``;

function collectScripts(folderName) {
    fs.readdirSync(folderName).map((fileName) => {
        if (fs.statSync(folderName + "/" + fileName).isDirectory()) {
            collectScripts(folderName + "/" + fileName);
        }
        else {
            if (fileName.endsWith(".js") && !(fileName.indexOf("worker") >= 0)) {
            scripts += `<script src="${fileName}"></script>
`;
            }
        }
    });
}
collectScripts(distFolder);

let replaced = file.replace(/@@@insert/gm, scripts);

fs.writeFileSync("./dist/index.html", replaced);
fs.writeFileSync("./dist/revealFrame.html", other);
