import "server-only";

/** Extract plain text from a CV buffer (PDF, DOCX, or plain text). */
export async function extractCvText(buffer: Buffer, fileName: string): Promise<string> {
  const lower = fileName.toLowerCase();
  try {
    if (lower.endsWith(".pdf")) {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const result = await parser.getText();
      await parser.destroy();
      return (result.text || "").trim();
    }
    if (lower.endsWith(".docx")) {
      const mammoth = (await import("mammoth")).default;
      const result = await mammoth.extractRawText({ buffer });
      return (result.value || "").trim();
    }
    // plain text / fallback
    return buffer.toString("utf-8").trim();
  } catch (err) {
    console.error("extractCvText failed", fileName, err);
    return "";
  }
}
