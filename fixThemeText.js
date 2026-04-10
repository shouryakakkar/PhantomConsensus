const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

walk('src', (filepath) => {
  if (!filepath.endsWith('.tsx')) return;
  console.log('Processing', filepath);
  let content = fs.readFileSync(filepath, 'utf8');
  
  // Replace text-white and variations
  content = content.replace(/\btext-white\b/g, 'text-foreground');
  
  // Revert buttons that must absolutely remain white due to dark gradients
  // specifically btn-primary content and the gap score in DivergenceMap which sits on a generated color
  content = content.replace(/font-semibold text-foreground flex items-center/, 'font-semibold text-white flex items-center'); // Form submit button
  
  // Replace border-white/XX with border-foreground/XX
  content = content.replace(/\bborder-white\b/g, 'border-foreground');

  fs.writeFileSync(filepath, content, 'utf8');
});
console.log('Done');
