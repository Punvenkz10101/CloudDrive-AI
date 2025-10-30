# OCR and AI Chat System Setup

## Overview
This system automatically processes uploaded PDFs and images using Tesseract OCR, then uses Gemini AI to answer questions about the extracted content.

## Features
1. **Automatic OCR Processing**: PDFs and images are automatically scanned on upload
2. **Gemini AI Integration**: Uses Google's Gemini API for intelligent document Q&A
3. **Chat Interface**: Modern chat UI for asking questions about your files
4. **File Management**: View, download, and manage uploaded files

## Setup Instructions

### 1. Python Dependencies
Install required Python packages:
```bash
pip install -r server/requirements.txt
```

Required packages:
- `pdf2image>=1.16.0` - Convert PDF pages to images
- `pytesseract>=0.3.10` - Tesseract OCR wrapper
- `Pillow>=10.0.0` - Image processing
- `opencv-python>=4.8.0` - Advanced image preprocessing (optional but recommended)

### 2. Tesseract OCR Installation

**Windows:**
1. Download Tesseract from: https://github.com/UB-Mannheim/tesseract/wiki
2. Install to default location: `C:\Program Files\Tesseract-OCR`
3. The system will automatically detect it

**Linux/Mac:**
```bash
# Ubuntu/Debian
sudo apt-get install tesseract-ocr

# Mac
brew install tesseract
```

### 3. Environment Variables

Ensure your `.env` file contains:
```env
GEMINI_API_KEY=your_gemini_api_key_here
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=your_region
AWS_S3_BUCKET=your_bucket_name
```

### 4. Node.js Dependencies
The Gemini package is already installed. If needed:
```bash
npm install @google/generative-ai
```

## How It Works

### Upload Flow
1. User uploads a file (PDF/image) via the Upload page
2. File is saved locally and uploaded to S3
3. OCR processing automatically starts in the background
4. Text is extracted and stored in `server/extracted_text/`
5. Metadata is synced to `server/storage/file-metadata.json`

### Chat Flow
1. User asks a question in the chat interface
2. System searches for relevant files based on query
3. OCR content is loaded from extracted text files
4. Context is sent to Gemini AI
5. AI generates answer based on OCR-extracted content
6. Source files are displayed as clickable buttons

## File Structure

```
server/
├── lib/
│   ├── ocr_processing.py      # Main OCR processing logic
│   ├── ocr_content_loader.js   # Loads extracted text
│   └── gemini_ai.js            # Gemini API integration
├── routes/
│   ├── ocr.js                  # OCR processing endpoint
│   ├── search.js               # Search and AI answer endpoint
│   └── files.js                # File upload (triggers OCR)
└── extracted_text/              # OCR extracted text storage
    └── metadata.json           # OCR metadata

src/
├── components/
│   └── chat/
│       └── ChatInterface.tsx    # Chat UI component
└── pages/
    └── Upload.tsx              # Upload page with file list
```

## API Endpoints

### POST `/api/ocr/process`
Process a file with OCR
```json
{
  "filePath": "/path/to/file",
  "fileName": "blob-name.pdf"
}
```

### POST `/api/search/ai`
Get AI answer for a query
```json
{
  "query": "What is my SRN?",
  "type": "answer"
}
```

Response:
```json
{
  "success": true,
  "answer": {
    "answer": "Based on the documents...",
    "sourceFiles": [
      {
        "fileName": "file.pdf",
        "description": "ID Document",
        "downloadUrl": "/downloads/file.pdf"
      }
    ]
  }
}
```

## Troubleshooting

### OCR Not Working
- Check if Tesseract is installed: `tesseract --version`
- Check Python dependencies: `pip list | grep -E "pdf2image|pytesseract|Pillow"`
- Check file permissions in `server/storage/files/`

### Gemini API Errors
- Verify `GEMINI_API_KEY` in `.env`
- Check API key is valid at https://makersuite.google.com/app/apikey
- Review server logs for detailed error messages

### Files Not Processing
- Check server console for OCR logs
- Verify files are saved in `server/storage/files/`
- Check `server/extracted_text/metadata.json` for processing status

## Notes

- OCR processing runs asynchronously in the background after upload
- Large PDFs may take 30-60 seconds to process
- Extracted text is cached for faster subsequent queries
- Only the first 15,000 characters are stored in metadata for quick access
- Full extracted text is stored in separate `.txt` files




