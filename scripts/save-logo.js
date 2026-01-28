const fs = require('fs');
const path = require('path');

// Script to save base64 image data to logo.png file
// Usage: node scripts/save-logo.js <base64-data>

const args = process.argv.slice(2);
const base64Data = args[0];

if (!base64Data) {
    console.error('Error: Please provide base64 image data as argument');
    console.log('Usage: node scripts/save-logo.js <base64-data>');
    console.log('Example: node scripts/save-logo.js data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==');
    process.exit(1);
}

try {
    // Extract base64 part (remove data:image/*;base64, prefix)
    let base64Image = base64Data;
    if (base64Data.startsWith('data:')) {
        base64Image = base64Data.split(',')[1];
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Image, 'base64');

    // Define output path
    const projectRoot = path.join(__dirname, '..');
    const outputPath = path.join(projectRoot, 'src', 'assets', 'img', 'logo.png');

    // Ensure directory exists
    const dirPath = path.dirname(outputPath);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    // Write file
    fs.writeFileSync(outputPath, imageBuffer);

    console.log('✅ Logo saved successfully!');
    console.log('Path:', outputPath);
    console.log('Size:', imageBuffer.length, 'bytes');

} catch (error) {
    console.error('❌ Error saving logo:', error.message);
    process.exit(1);
}
