# Empresa Logo Management

## How it works

This implementation allows you to upload and manage your company logo in the `assets/img/` directory with the name ``.

## Features

1. **Upload Logo**: Select an image file (JPG, PNG, GIF, WEBP) up to 5MB
2. **Automatic Replacement**: When uploading a new logo, the old one is automatically removed
3. **Persistent Storage**: Logo is stored in browser's localStorage
4. **Preview**: See the logo preview before saving
5. **Delete Option**: Remove custom logo and revert to default

## Usage

### In the Browser (Development)

1. Navigate to the Empresa module
2. Click "Seleccionar Imagen" to upload your logo
3. The logo will be saved with the key "logo" in localStorage
4. Use "Eliminar Logo" to remove the custom logo

### Deploy to Assets Folder

To permanently save the logo to `src/assets/img/logo.png`:

#### Method 1: Manual Deployment
1. Upload your logo in the browser
2. Open browser DevTools (F12)
3. Go to Application > Local Storage
4. Copy the value of the "logo" key
5. Use an online base64 to image converter
6. Save the converted image as `logo.png` in `src/assets/img/`

#### Method 2: Using Scripts
```bash
# Deploy script (shows instructions)
npm run deploy-logo

# Save logo directly from base64 data
npm run save-logo "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
```

## Technical Details

- **Storage**: Uses localStorage with key "logo"
- **Format**: Images are converted to base64 Data URLs
- **Validation**: 
  - File types: JPG, PNG, GIF, WEBP
  - Max size: 5MB
- **Replacement**: Old logo is automatically removed when uploading new one

## File Structure

```
src/
  assets/
    img/
      logo.png          # Default logo (fallback)
  app/
    pages/
      modules/
        empresa/
          empresa.component.ts    # Main component
          empresa.component.html   # Template
scripts/
  deploy-logo.js        # Deployment instructions
  save-logo.js          # Save base64 to file
```

## Limitations

- localStorage has size limits (usually 5-10MB)
- For production, consider implementing server-side file storage
- Images are stored as base64 which increases file size by ~33%
