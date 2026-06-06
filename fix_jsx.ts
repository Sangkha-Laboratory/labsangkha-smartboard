import fs from 'fs';
const filePath = 'src/components/SafetyPolicy.tsx';
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

// Find insertion point for import
const importIndex = lines.findIndex(l => l.includes('import {') && l.includes('} from \'lucide-react\';'));
lines.splice(importIndex + 1, 0, "import PrivacyContent from './PrivacyContent';");

// Replace the content
// Needs manual find for the start and end of the block
const startIndex = lines.findIndex(l => l.includes('{activeTab === \'public_privacy\' && ('));
// Search for the closing parenthesis of the if condition
let endIndex = -1;
for (let i = startIndex; i < lines.length; i++) {
    if (lines[i].includes(')}')) {
        endIndex = i;
        break;
    }
}

// Replace the block
const newBlock = `                {activeTab === 'public_privacy' && (
                  <PrivacyContent />
                )}`;

lines.splice(startIndex, endIndex - startIndex + 1, newBlock);

fs.writeFileSync(filePath, lines.join('\n'));
console.log('Fixed!');
