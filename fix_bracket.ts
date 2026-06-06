import fs from 'fs';
const filePath = 'src/components/SafetyPolicy.tsx';
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');
lines.splice(305, 0, '                )}');
fs.writeFileSync(filePath, lines.join('\n'));
console.log('Fixed!');
