export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExtractedField {
  id: string;
  label: string;
  value: string;
  bbox: BBox;
}

export interface PageSize {
  width: number;
  height: number;
}

export interface InvoicePreview {
  invoiceNumber: string;
  vendorName: string;
  clientName: string;
  totalDue: string;
  dueDate: string;
}

export interface InvoiceCardData {
  id: string;
  fileName: string;
  preview: InvoicePreview;
  pdfUrl: string;
  isUserUpload: boolean;
}

export interface ExtractionResult {
  numPages: number;
  fields: ExtractedField[];
  pageSize: PageSize;
  isLikelyInvoice: boolean;
}
