const fs = require('fs');
const path = require('path');

const outDir = path.resolve(__dirname, 'out');

if (!fs.existsSync(outDir)) {
    console.error('out directory does not exist.');
    process.exit(1);
}

function walkAndRename(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        if (file === '_locales') continue;

        const oldPath = path.join(dir, file);
        const stats = fs.statSync(oldPath);

        let newName = file;
        if (file.startsWith('_')) {
            newName = file.replace(/^_/, '');
            const newPath = path.join(dir, newName);

            if (fs.existsSync(newPath)) {
                if (fs.statSync(newPath).isDirectory()) {
                    fs.rmSync(newPath, { recursive: true, force: true });
                } else {
                    fs.unlinkSync(newPath);
                }
            }

            fs.renameSync(oldPath, newPath);
            console.log(`[Renamed] ${oldPath} -> ${newPath}`);
            
            // 이름이 바뀐 폴더면 바뀐 경로로 계속 탐색
            if (stats.isDirectory()) {
                walkAndRename(newPath);
            }
        } else if (stats.isDirectory()) {
            walkAndRename(oldPath);
        }
    }
}

function fixContent(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
            fixContent(filePath);
        } else if (/\.(html|js|json|css|txt|map)$/.test(file)) {
            let content = fs.readFileSync(filePath, 'utf8');
            // _next/ -> next/ , /_next -> /next 등을 일괄 치환
            const updatedContent = content.replace(/\/_next/g, '/next')
                                          .replace(/_next\//g, 'next/')
                                          .replace(/\/_not-found/g, '/not-found')
                                          .replace(/_not-found\//g, 'not-found/');

            if (content !== updatedContent) {
                fs.writeFileSync(filePath, updatedContent, 'utf8');
                console.log(`[Updated] ${filePath}`);
            }
        }
    }
}

console.log('--- Cleaning underscores ---');
walkAndRename(outDir);
fixContent(outDir);
console.log('--- Done ---');
