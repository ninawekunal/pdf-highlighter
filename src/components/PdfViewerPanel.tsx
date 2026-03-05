import type { RefObject } from 'react';
import { Document, Page } from 'react-pdf';
import { Typography } from '@mui/material';
import type { InvoiceCardData } from '../types';

interface HighlightStyle {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface PdfViewerPanelProps {
  currentInvoice: InvoiceCardData | null;
  pageRenderWidth: number;
  pageRenderHeight: number;
  highlightStyle: HighlightStyle | null;
  viewerRef: RefObject<HTMLDivElement | null>;
}

export default function PdfViewerPanel({
  currentInvoice,
  pageRenderWidth,
  pageRenderHeight,
  highlightStyle,
  viewerRef,
}: PdfViewerPanelProps) {
  return (
    <div className="panel viewer-panel" ref={viewerRef}>
      <div className="panel-header">
        <Typography component="h2" variant="h6">PDF Viewer</Typography>
        {currentInvoice ? (
          <a className="download-button" href={currentInvoice.pdfUrl} download={currentInvoice.fileName}>
            Download PDF
          </a>
        ) : null}
      </div>

      <div className="pdf-container">
        {!currentInvoice ? (
          <p className="empty-state">Select an invoice to render the PDF.</p>
        ) : (
          <Document
            file={currentInvoice.pdfUrl}
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
  );
}
