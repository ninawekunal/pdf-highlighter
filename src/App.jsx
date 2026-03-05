import { useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import './App.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const Y_TOLERANCE = 1.5;

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function toOverlayStyle(bbox, pageSize, scale) {
  const left = bbox.x * scale;
  const top = (pageSize.height - bbox.y - bbox.height) * scale;

  return {
    left,
    top,
    width: Math.max(bbox.width * scale, 28),
    height: Math.max(bbox.height * scale, 18),
  };
}

function useElementWidth(ref) {
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

async function extractInvoiceFields(pdfUrl, fieldOrder) {
  const loadingTask = pdfjs.getDocument(pdfUrl);
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  const pageViewport = page.getViewport({ scale: 1 });
  const textContent = await page.getTextContent();

  const items = textContent.items
    .filter((item) => typeof item.str === 'string' && Array.isArray(item.transform))
    .map((item) => ({
      str: item.str.trim(),
      x: item.transform[4],
      y: item.transform[5],
      width: item.width ?? 0,
      height: item.height ?? (Math.abs(item.transform[3]) || 12),
    }))
    .filter((item) => item.str.length > 0);

  const fields = [];

  for (const label of fieldOrder) {
    const labelText = `${label}:`;
    const labelItem = items.find((item) => item.str === labelText);

    if (!labelItem) {
      continue;
    }

    const valueItem = items
      .filter(
        (item) =>
          item.str !== labelText
          && item.x >= labelItem.x + labelItem.width - 1
          && Math.abs(item.y - labelItem.y) <= Y_TOLERANCE,
      )
      .sort((a, b) => a.x - b.x)[0];

    if (!valueItem) {
      continue;
    }

    fields.push({
      id: `${slugify(label)}-${fields.length}`,
      label,
      value: valueItem.str,
      bbox: {
        x: valueItem.x,
        y: valueItem.y,
        width: valueItem.width,
        height: valueItem.height,
      },
    });
  }

  return {
    fields,
    pageSize: {
      width: pageViewport.width,
      height: pageViewport.height,
    },
  };
}

export default function App() {
  const [invoiceIndex, setInvoiceIndex] = useState([]);
  const [fieldOrder, setFieldOrder] = useState([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [extractedFields, setExtractedFields] = useState([]);
  const [activeFieldId, setActiveFieldId] = useState(null);
  const [pageSize, setPageSize] = useState({ width: 612, height: 792 });
  const [isExtracting, setIsExtracting] = useState(false);
  const [appError, setAppError] = useState('');

  const viewerRef = useRef(null);
  const viewerWidth = useElementWidth(viewerRef);

  useEffect(() => {
    let ignore = false;

    const loadInvoiceIndex = async () => {
      try {
        setAppError('');
        const response = await fetch(`${import.meta.env.BASE_URL}invoices/index.json`);

        if (!response.ok) {
          throw new Error(`Could not load invoice index (${response.status})`);
        }

        const payload = await response.json();

        if (!ignore) {
          setInvoiceIndex(payload.invoices ?? []);
          setFieldOrder(payload.fieldOrder ?? []);
          setSelectedInvoiceId(payload.invoices?.[0]?.id ?? null);
        }
      } catch (error) {
        if (!ignore) {
          setAppError(error.message);
        }
      }
    };

    loadInvoiceIndex();

    return () => {
      ignore = true;
    };
  }, []);

  const currentInvoice = useMemo(
    () => invoiceIndex.find((invoice) => invoice.id === selectedInvoiceId) ?? null,
    [invoiceIndex, selectedInvoiceId],
  );

  const currentPdfUrl = useMemo(
    () => (currentInvoice ? `${import.meta.env.BASE_URL}invoices/${currentInvoice.fileName}` : null),
    [currentInvoice],
  );

  useEffect(() => {
    if (!currentPdfUrl || fieldOrder.length === 0) {
      return undefined;
    }

    let ignore = false;

    const runExtraction = async () => {
      try {
        setIsExtracting(true);
        setAppError('');
        setExtractedFields([]);
        setActiveFieldId(null);

        const result = await extractInvoiceFields(currentPdfUrl, fieldOrder);

        if (ignore) {
          return;
        }

        setExtractedFields(result.fields);
        setPageSize(result.pageSize);
        setActiveFieldId(result.fields[0]?.id ?? null);
      } catch (error) {
        if (!ignore) {
          setExtractedFields([]);
          setActiveFieldId(null);
          setAppError(error.message);
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
  }, [currentPdfUrl, fieldOrder]);

  const activeField = useMemo(
    () => extractedFields.find((field) => field.id === activeFieldId) ?? null,
    [extractedFields, activeFieldId],
  );

  const pageRenderWidth = Math.max(Math.floor(viewerWidth) - 24, 320);
  const pageScale = pageSize.width > 0 ? pageRenderWidth / pageSize.width : 1;
  const pageRenderHeight = pageSize.height * pageScale;

  const highlightStyle = useMemo(() => {
    if (!activeField) {
      return null;
    }

    return toOverlayStyle(activeField.bbox, pageSize, pageScale);
  }, [activeField, pageScale, pageSize]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <p className="eyebrow">React + PDF.js</p>
        <h1>Invoice Field Extractor</h1>
        <p className="subtitle">
          Select one of the generated invoices, inspect extracted fields, and click a field to highlight
          its location in the PDF.
        </p>
      </header>

      <section className="carousel-section">
        <div className="section-title-row">
          <h2>Invoices</h2>
          <span>{invoiceIndex.length} generated samples</span>
        </div>
        <div className="invoice-carousel" role="tablist" aria-label="Invoice selector">
          {invoiceIndex.map((invoice, index) => {
            const selected = invoice.id === selectedInvoiceId;
            return (
              <button
                key={invoice.id}
                type="button"
                className={`invoice-card ${selected ? 'selected' : ''}`}
                onClick={() => setSelectedInvoiceId(invoice.id)}
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <p className="invoice-id">{invoice.preview.invoiceNumber}</p>
                <p className="invoice-row">{invoice.preview.vendorName}</p>
                <p className="invoice-row">Client: {invoice.preview.clientName}</p>
                <div className="invoice-bottom-row">
                  <span>{invoice.preview.totalDue}</span>
                  <span>Due {invoice.preview.dueDate}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="content-grid">
        <div className="panel viewer-panel">
          <div className="panel-header">
            <h2>PDF Viewer</h2>
            {currentPdfUrl ? (
              <a className="download-button" href={currentPdfUrl} download={currentInvoice?.fileName}>
                Download PDF
              </a>
            ) : null}
          </div>

          <div className="pdf-container" ref={viewerRef}>
            {!currentPdfUrl ? (
              <p className="empty-state">Select an invoice to render the PDF.</p>
            ) : (
              <Document
                file={currentPdfUrl}
                loading={<p className="empty-state">Loading PDF document...</p>}
                error={<p className="empty-state">Unable to render this PDF.</p>}
              >
                <div className="page-stage" style={{ width: `${pageRenderWidth}px`, height: `${pageRenderHeight}px` }}>
                  <Page
                    pageNumber={1}
                    width={pageRenderWidth}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                    loading=""
                  />
                  {highlightStyle ? (
                    <div
                      className="field-highlight"
                      style={{
                        left: `${highlightStyle.left}px`,
                        top: `${highlightStyle.top}px`,
                        width: `${highlightStyle.width}px`,
                        height: `${highlightStyle.height}px`,
                      }}
                    />
                  ) : null}
                </div>
              </Document>
            )}
          </div>
        </div>

        <div className="panel fields-panel">
          <div className="panel-header">
            <h2>Extracted Fields</h2>
            {isExtracting ? <span className="status-pill">Extracting...</span> : null}
          </div>

          {appError ? <p className="error-state">{appError}</p> : null}

          {!appError && !isExtracting && extractedFields.length === 0 ? (
            <p className="empty-state">No fields found yet for this invoice.</p>
          ) : null}

          <ul className="field-list">
            {extractedFields.map((field, index) => {
              const selected = field.id === activeFieldId;
              return (
                <li key={field.id} style={{ animationDelay: `${index * 45}ms` }}>
                  <button
                    type="button"
                    className={`field-item ${selected ? 'active' : ''}`}
                    onClick={() => setActiveFieldId(field.id)}
                  >
                    <span className="field-label">{field.label}</span>
                    <span className="field-value">{field.value}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </div>
  );
}
