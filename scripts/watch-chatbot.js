const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const fileToWatch = path.join(rootDir, 'chatbot', 'index.ts');
const generatorScript = path.join(__dirname, 'generate-chatbot-diagram.js');

console.log(`👀 Vigilando cambios en: ${path.relative(rootDir, fileToWatch)}`);
console.log('💡 Cada vez que guardes el archivo, el diagrama se actualizará automáticamente...');

let debounceTimeout = null;

if (!fs.existsSync(fileToWatch)) {
  console.error(`❌ El archivo ${fileToWatch} no existe.`);
  process.exit(1);
}

fs.watch(fileToWatch, (eventType) => {
  if (eventType === 'change') {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      try {
        console.log('\n⚡ Cambio detectado en chatbot/index.ts. Regenerando diagrama...');
        execSync(`node "${generatorScript}"`, { stdio: 'inherit', cwd: rootDir });
      } catch (err) {
        console.error('Error al regenerar diagrama:', err.message);
      }
    }, 300);
  }
});
