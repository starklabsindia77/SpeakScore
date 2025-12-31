
const pdf = require('pdf-parse');
import mammoth from 'mammoth';

export class ExtractionService {
    async extractText(buffer: Buffer, mimeType: string): Promise<string> {
        if (mimeType === 'application/pdf') {
            return this.extractPdf(buffer);
        } else if (
            mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            mimeType === 'application/msword'
        ) {
            return this.extractDocx(buffer);
        } else if (mimeType.startsWith('text/')) {
            return buffer.toString('utf-8');
        }
        throw new Error(`Unsupported file type: ${mimeType}`);
    }

    private async extractPdf(buffer: Buffer): Promise<string> {
        const data = await pdf(buffer);
        return data.text;
    }

    private async extractDocx(buffer: Buffer): Promise<string> {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    }
}
