import pdfParse from 'pdf-parse'

export async function extractTextFromCv(fileBuffer: Buffer, mimeType: string): Promise<string> {
  try {
    if (mimeType === 'application/pdf') {
      return await extractTextFromPdf(fileBuffer)
    } else if (mimeType === 'text/plain') {
      return fileBuffer.toString('utf-8').trim()
    } else if (
      mimeType === 'application/msword' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      console.warn('Word document text extraction not yet implemented. Store CV URL for manual review.')
      return ''
    } else {
      throw new Error(`Unsupported CV mime type: ${mimeType}`)
    }
  } catch (error) {
    console.error('Error extracting text from CV:', error)
    throw error
  }
}

async function extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(pdfBuffer as any)
    return (data.text || '').trim()
  } catch (error) {
    console.error('Error extracting text from PDF:', error)
    throw error
  }
}
