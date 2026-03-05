interface HeaderBannerProps {
  onUploadClick: () => void;
}

export default function HeaderBanner({ onUploadClick }: HeaderBannerProps) {
  return (
    <header className="app-header">
      <div className="header-main">
        <p className="eyebrow">React + PDF.js + TypeScript</p>
        <h1>Invoice Field Extractor</h1>
        <p className="subtitle">
          Use generated samples or upload a one-page invoice PDF to test extraction and highlight mapping.
        </p>
      </div>

      <button type="button" className="upload-button" onClick={onUploadClick}>
        Add Your PDF
      </button>
    </header>
  );
}
