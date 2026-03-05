import { useEffect, useMemo, useRef, useState, type FormEvent, type RefObject } from 'react';
import { Box, Paper, Typography, useMediaQuery } from '@mui/material';
import { pdfjs } from 'react-pdf';
import HeaderBanner from './components/HeaderBanner';
import InvoiceCarousel from './components/InvoiceCarousel';
import FieldsPanel from './components/FieldsPanel';
import PdfViewerPanel from './components/PdfViewerPanel';
import UploadInvoiceDialog from './components/UploadInvoiceDialog';
import { buildPreview, extractInvoiceFields, toOverlayStyle } from './utils/pdfExtraction';
import type { ExtractionResult, InvoiceCardData, PageSize } from './types';
import './App.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface InvoiceIndexEntry {
  id: string;
  fileName: string;
  preview: InvoiceCardData['preview'];
}

function useElementWidth(ref: RefObject<HTMLDivElement | null>): number {
  const [width, setWidth] = useState(700);

  useEffect(() => {
    if (!ref.current) {
      return undefined;
    }

    const observer = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect?.width;
      if (nextWidth) {
        setWidth(nextWidth);
      }
    });

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [ref]);

  return width;
}

export default function App() {
  const [invoiceIndex, setInvoiceIndex] = useState<InvoiceIndexEntry[]>([]);
  const [uploadedInvoices, setUploadedInvoices] = useState<InvoiceCardData[]>([]);
  const [fieldOrder, setFieldOrder] = useState<string[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [extractedFields, setExtractedFields] = useState<ExtractionResult['fields']>([]);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<PageSize>({ width: 612, height: 792 });
  const [isExtracting, setIsExtracting] = useState(false);
  const [appError, setAppError] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const uploadedInvoicesRef = useRef<InvoiceCardData[]>([]);
  const extractionCacheRef = useRef<Map<string, ExtractionResult>>(new Map());
  const viewerPanelRef = useRef<HTMLDivElement | null>(null);
  const viewerInnerRef = useRef<HTMLDivElement | null>(null);
  const viewerWidth = useElementWidth(viewerInnerRef);
  const isMobile = useMediaQuery('(max-width:980px)');

  useEffect(() => {
    uploadedInvoicesRef.current = uploadedInvoices;
  }, [uploadedInvoices]);

  useEffect(() => {
    return () => {
      for (const invoice of uploadedInvoicesRef.current) {
        URL.revokeObjectURL(invoice.pdfUrl);
      }
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadInvoiceIndex = async () => {
      try {
        setAppError('');
        const response = await fetch(`${import.meta.env.BASE_URL}invoices/index.json`);

        if (!response.ok) {
          throw new Error(`Could not load invoice index (${response.status})`);
        }

        const payload = (await response.json()) as {
          invoices: InvoiceIndexEntry[];
          fieldOrder: string[];
        };

        if (!ignore) {
          setInvoiceIndex(payload.invoices ?? []);
          setFieldOrder(payload.fieldOrder ?? []);
          setSelectedInvoiceId(payload.invoices?.[0]?.id ?? null);
        }
      } catch (error) {
        if (!ignore) {
          setAppError(error instanceof Error ? error.message : 'Failed to load invoice index.');
        }
      }
    };

    loadInvoiceIndex();

    return () => {
      ignore = true;
    };
  }, []);

  const allInvoices = useMemo<InvoiceCardData[]>(() => {
    const generatedInvoices: InvoiceCardData[] = invoiceIndex.map((invoice) => ({
      ...invoice,
      isUserUpload: false,
      pdfUrl: `${import.meta.env.BASE_URL}invoices/${invoice.fileName}`,
    }));

    return [...uploadedInvoices, ...generatedInvoices];
  }, [invoiceIndex, uploadedInvoices]);

  const currentInvoice = useMemo(
    () => allInvoices.find((invoice) => invoice.id === selectedInvoiceId) ?? null,
    [allInvoices, selectedInvoiceId],
  );

  useEffect(() => {
    if (!currentInvoice) {
      return undefined;
    }

    const cached = extractionCacheRef.current.get(currentInvoice.id);
    if (cached) {
      setAppError('');
      setExtractedFields(cached.fields);
      setPageSize(cached.pageSize);
      setActiveFieldId(cached.fields[0]?.id ?? null);
      setIsExtracting(false);
      return undefined;
    }

    let ignore = false;

    const runExtraction = async () => {
      try {
        setIsExtracting(true);
        setAppError('');
        setExtractedFields([]);
        setActiveFieldId(null);

        const result = await extractInvoiceFields(currentInvoice.pdfUrl, fieldOrder);

        if (ignore) {
          return;
        }

        extractionCacheRef.current.set(currentInvoice.id, result);
        setExtractedFields(result.fields);
        setPageSize(result.pageSize);
        setActiveFieldId(result.fields[0]?.id ?? null);
      } catch (error) {
        if (!ignore) {
          setExtractedFields([]);
          setActiveFieldId(null);
          setAppError(error instanceof Error ? error.message : 'Failed to extract fields from PDF.');
        }
      } finally {
        if (!ignore) {
          setIsExtracting(false);
        }
      }
    };

    runExtraction();

    return () => {
      ignore = true;
    };
  }, [currentInvoice, fieldOrder]);

  const activeField = useMemo(
    () => extractedFields.find((field) => field.id === activeFieldId) ?? null,
    [extractedFields, activeFieldId],
  );

  const pageRenderWidth = Math.min(Math.max(Math.floor(viewerWidth) - 24, 420), 980);
  const pageScale = pageSize.width > 0 ? pageRenderWidth / pageSize.width : 1;
  const pageRenderHeight = pageSize.height * pageScale;

  const highlightStyle = useMemo(() => {
    if (!activeField) {
      return null;
    }

    return toOverlayStyle(activeField.bbox, pageSize, pageScale);
  }, [activeField, pageScale, pageSize]);

  const closeUploadModal = () => {
    setIsUploadModalOpen(false);
    setUploadError('');
    setUploadFile(null);
  };

  const handleUploadSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!uploadFile) {
      setUploadError('Choose a PDF invoice to upload.');
      return;
    }

    const isPdf = uploadFile.type === 'application/pdf' || uploadFile.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setUploadError('Only PDF files are supported.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError('');

      const bytes = new Uint8Array(await uploadFile.arrayBuffer());
      const result = await extractInvoiceFields(bytes, fieldOrder);

      if (result.numPages !== 1) {
        throw new Error('Only 1-page invoices are supported.');
      }

      if (!result.isLikelyInvoice) {
        throw new Error('Only invoices are supported. This PDF does not appear to be an invoice.');
      }

      const uploadId = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const objectUrl = URL.createObjectURL(uploadFile);

      const uploaded: InvoiceCardData = {
        id: uploadId,
        fileName: uploadFile.name,
        preview: buildPreview(result.fields, uploadFile.name),
        pdfUrl: objectUrl,
        isUserUpload: true,
      };

      extractionCacheRef.current.set(uploadId, result);
      setUploadedInvoices((current) => [uploaded, ...current]);
      setSelectedInvoiceId(uploadId);
      closeUploadModal();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFieldClick = (fieldId: string) => {
    setActiveFieldId((prev) => (prev === fieldId ? null : fieldId));

    if (isMobile) {
      window.requestAnimationFrame(() => {
        viewerPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  return (
    <div className="app-shell">
      <HeaderBanner onUploadClick={() => setIsUploadModalOpen(true)} />

      <Paper className="carousel-section" elevation={0}>
        <div className="section-title-row">
          <Typography component="h2" variant="h6">Invoices</Typography>
          <Typography component="span">{allInvoices.length} total ({uploadedInvoices.length} local uploads)</Typography>
        </div>

        <InvoiceCarousel
          invoices={allInvoices}
          selectedInvoiceId={selectedInvoiceId}
          onSelectInvoice={setSelectedInvoiceId}
        />
      </Paper>

      <Box className="content-grid">
        <div className="fields-order-wrap">
          <FieldsPanel
            extractedFields={extractedFields}
            activeFieldId={activeFieldId}
            isExtracting={isExtracting}
            appError={appError}
            onFieldClick={handleFieldClick}
          />
        </div>

        <div ref={viewerPanelRef} className="viewer-order-wrap">
          <PdfViewerPanel
            currentInvoice={currentInvoice}
            pageRenderWidth={pageRenderWidth}
            pageRenderHeight={pageRenderHeight}
            highlightStyle={highlightStyle}
            viewerRef={viewerInnerRef}
          />
        </div>
      </Box>

      <UploadInvoiceDialog
        open={isUploadModalOpen}
        uploadError={uploadError}
        isUploading={isUploading}
        onClose={closeUploadModal}
        onFileChange={setUploadFile}
        onSubmit={handleUploadSubmit}
      />
    </div>
  );
}
