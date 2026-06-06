import fs from 'fs';
const filePath = 'src/components/SafetyPolicy.tsx';
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

// Find the Privacy Tab block
const startIndex = lines.findIndex(l => l.includes('{activeTab === \'public_privacy\' && ('));
const privacyContentIndex = lines.findIndex(l => l.includes('<PrivacyContent />'));

// The broken content starts after <PrivacyContent />
// Find where 'public_terms' starts
const termsIndex = lines.findIndex(l => l.includes('{activeTab === \'public_terms\' && ('));

// Remove everything between privacyContentIndex+1 and termsIndex
lines.splice(privacyContentIndex + 1, termsIndex - privacyContentIndex - 1);

fs.writeFileSync(filePath, lines.join('\n'));
console.log('Fixed!');
