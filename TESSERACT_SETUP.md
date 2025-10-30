# Tesseract OCR Setup Guide

## Quick Setup for Windows

### Option 1: Install Tesseract (Recommended)

1. **Download Tesseract:**
   - Go to: https://github.com/UB-Mannheim/tesseract/wiki
   - Download the latest installer (e.g., `tesseract-ocr-w64-setup-5.3.0.20221214.exe`)

2. **Install:**
   - Run the installer
   - Install to default location: `C:\Program Files\Tesseract-OCR`
   - ✅ **Important:** Check "Add to PATH" during installation, OR add manually (see below)

3. **Verify Installation:**
   ```powershell
   tesseract --version
   ```

### Option 2: Add Tesseract to PATH (If Already Installed)

If Tesseract is already installed but not in PATH:

1. **Find Tesseract Installation:**
   - Usually at: `C:\Program Files\Tesseract-OCR`
   - Or: `C:\Program Files (x86)\Tesseract-OCR`

2. **Add to PATH:**
   - Press `Win + X` → System → Advanced system settings
   - Click "Environment Variables"
   - Under "System variables", find "Path" → Edit
   - Add: `C:\Program Files\Tesseract-OCR`
   - Click OK on all windows

3. **Restart Terminal:**
   - Close and reopen PowerShell/Command Prompt
   - Test: `tesseract --version`

### Option 3: Manual Path Configuration

If you can't add to PATH, the Python script will automatically detect Tesseract at common locations:
- `C:\Program Files\Tesseract-OCR\tesseract.exe`
- `C:\Program Files (x86)\Tesseract-OCR\tesseract.exe`
- `C:\Tesseract-OCR\tesseract.exe`

Just ensure Tesseract is installed at one of these locations.

## Verify Setup

After installation, test OCR:

```powershell
python -c "import pytesseract; print(pytesseract.pytesseract.tesseract_cmd)"
```

This should print the path to `tesseract.exe`.

## Troubleshooting

### "TesseractNotFoundError"
- **Solution:** Install Tesseract or ensure it's in PATH
- Or verify it's at one of the common installation paths

### "No module named 'pytesseract'"
- **Solution:** Install Python package:
  ```bash
  pip install pytesseract
  ```

### "No module named 'pdf2image'"
- **Solution:** Install Python package:
  ```bash
  pip install pdf2image Pillow
  ```

### OCR Quality Issues
- Ensure images/PDFs are clear and high-resolution
- Preprocessing is handled automatically by the script
- For better results, use images with good contrast

## Testing OCR

Test with a sample image:

```python
import pytesseract
from PIL import Image

# Update path if needed
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# Test
image = Image.open('test.jpg')
text = pytesseract.image_to_string(image)
print(text)
```

## Alternative: Chocolatey Installation

If you use Chocolatey:

```powershell
choco install tesseract
```

This automatically adds Tesseract to PATH.




