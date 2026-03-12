import fs from 'fs';

function getUniqueCategories(filename) {
    const data = fs.readFileSync(filename, 'utf-8');
    const lines = data.split('\n');
    const categories = new Set();
    
    // Skip header
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Simple CSV parser for quoted fields
        let fields = [];
        let current = '';
        let inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                if (inQuotes && line[j+1] === '"') {
                    current += '"';
                    j++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                fields.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        fields.push(current);
        
        // Category is at index 6
        if (fields[6]) {
            categories.add(fields[6].trim().replace(/^"|"$/g, ''));
        }
    }
    
    return Array.from(categories).sort();
}

try {
    const cats = getUniqueCategories('new_prod.csv');
    console.log('Unique Categories in new_prod.csv:');
    cats.forEach(cat => console.log(`- ${cat}`));
} catch (err) {
    console.error('Error:', err.message);
}
