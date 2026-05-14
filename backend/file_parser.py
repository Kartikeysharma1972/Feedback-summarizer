import io

MAX_TEXT_LENGTH = 15000


def extract_text(file_bytes: bytes, filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext == "pdf":
        return _extract_pdf(file_bytes)
    elif ext == "docx":
        return _extract_docx(file_bytes)
    elif ext == "txt":
        return _extract_txt(file_bytes)
    else:
        raise ValueError(f"Unsupported file type: .{ext}. Supported types: PDF, DOCX, TXT")


def _extract_pdf(file_bytes: bytes) -> str:
    from PyPDF2 import PdfReader

    reader = PdfReader(io.BytesIO(file_bytes))
    text_parts = []
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text_parts.append(page_text)
    text = "\n\n".join(text_parts)
    return text[:MAX_TEXT_LENGTH]


def _extract_docx(file_bytes: bytes) -> str:
    from docx import Document

    doc = Document(io.BytesIO(file_bytes))
    text_parts = [p.text for p in doc.paragraphs if p.text.strip()]
    text = "\n\n".join(text_parts)
    return text[:MAX_TEXT_LENGTH]


def _extract_txt(file_bytes: bytes) -> str:
    text = file_bytes.decode("utf-8", errors="ignore")
    return text[:MAX_TEXT_LENGTH]
