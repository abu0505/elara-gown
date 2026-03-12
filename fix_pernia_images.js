import fs from 'fs';

const CSV_FILE = 'new_prod.csv';

function fixImages() {
  if (!fs.existsSync(CSV_FILE)) {
    console.error('File not found:', CSV_FILE);
    return;
  }

  const csv = fs.readFileSync(CSV_FILE, 'utf-8');
  const lines = csv.split('\n');

  let fixedCount = 0;
  
  const newLines = lines.map(line => {
    // Only modify Pernia rows
    if (line.includes('perniaspopupshop.com')) {
      // Find all ?impolicy=... and anything else up to the next quote, comma or space
      // Since it's inside quotes typically like "url1?impolicy..., url2?impolicy..."
      // We can just regex replace ?impolicy=[a-zA-Z0-9&_=]* 
      const oldLine = line;
      // We can aggressively just remove everything from ? to the next comma or quote or space
      // Let's remove specifically ?impolicy=[a-zA-Z0-9&_=%]*
      const fixedLine = line.replace(/\?impolicy=[a-zA-Z0-9&_=%]*/g, '');
      
      if (oldLine !== fixedLine) {
        fixedCount++;
      }
      return fixedLine;
    }
    return line;
  });

  fs.writeFileSync(CSV_FILE, newLines.join('\n'));
  console.log(`Successfully fixed images for ${fixedCount} products in ${CSV_FILE}`);
}

fixImages();
