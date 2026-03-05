import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'public', 'invoices');

const FIELD_ORDER = [
  'Invoice Number',
  'Invoice Date',
  'Due Date',
  'Vendor Name',
  'Vendor Email',
  'Client Name',
  'Client Email',
  'Subtotal',
  'Tax',
  'Total Due',
];

const vendors = [
  { name: 'Northwind Analytics', email: 'billing@northwind-analytics.com' },
  { name: 'Cedar & Pine Studio', email: 'accounts@cedarpine.studio' },
  { name: 'Evergreen Logistics', email: 'invoices@evergreen-logistics.co' },
  { name: 'Atlas Data Systems', email: 'finance@atlas-data.io' },
  { name: 'Sparrow Digital', email: 'billing@sparrowdigital.dev' },
  { name: 'Blue Harbor Works', email: 'accounts@blueharborworks.com' },
  { name: 'Summit Retail Labs', email: 'finance@summitretaillabs.com' },
  { name: 'Lumen Health Partners', email: 'billing@lumenhealthpartners.com' },
  { name: 'Aurora Cloud Ops', email: 'invoices@auroracloudops.net' },
  { name: 'Fieldstone Advisory', email: 'accounts@fieldstoneadvisory.co' },
];

const clients = [
  { name: 'Ridgeway Foods', email: 'ap@ridgewayfoods.com' },
  { name: 'Marina Travel Co', email: 'finance@marinatravel.co' },
  { name: 'Kiteboard Labs', email: 'payments@kiteboardlabs.com' },
  { name: 'Westline Partners', email: 'ap@westlinepartners.org' },
  { name: 'Granite House Media', email: 'billing@granitehousemedia.io' },
  { name: 'Lakeside Clinic', email: 'finance@lakesideclinic.org' },
  { name: 'Papertrail Books', email: 'accounts@papertrailbooks.com' },
  { name: 'Skyline Capital Group', email: 'ap@skylinecapitalgroup.com' },
  { name: 'Hearth Home Goods', email: 'billing@hearthhomegoods.co' },
  { name: 'Orchid Labs', email: 'payments@orchidlabs.ai' },
];

function pad(number) {
  return String(number).padStart(2, '0');
}

function formatMoney(amount) {
  return `$${amount.toFixed(2)}`;
}

function buildInvoiceData(index) {
  const invoiceDate = new Date(2026, 0, 6 + index * 3);
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(invoiceDate.getDate() + 30);

  const subtotal = 920 + index * 137.45;
  const tax = subtotal * 0.0825;
  const total = subtotal + tax;

  const vendor = vendors[index - 1];
  const client = clients[index - 1];

  const fields = {
    'Invoice Number': `INV-2026-${pad(index)}`,
    'Invoice Date': invoiceDate.toISOString().slice(0, 10),
    'Due Date': dueDate.toISOString().slice(0, 10),
    'Vendor Name': vendor.name,
    'Vendor Email': vendor.email,
    'Client Name': client.name,
    'Client Email': client.email,
    Subtotal: formatMoney(subtotal),
    Tax: formatMoney(tax),
    'Total Due': formatMoney(total),
  };

  return {
    id: `invoice-${pad(index)}`,
    fileName: `invoice-${pad(index)}.pdf`,
    fields,
  };
}

async function createInvoicePdf(invoice) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  page.drawRectangle({
    x: 0,
    y: 0,
    width: 612,
    height: 792,
    color: rgb(0.97, 0.98, 0.99),
  });

  page.drawRectangle({
    x: 0,
    y: 724,
    width: 612,
    height: 68,
    color: rgb(0.1, 0.19, 0.34),
  });

  page.drawText('INVOICE', {
    x: 72,
    y: 748,
    size: 26,
    font: bold,
    color: rgb(0.95, 0.97, 1),
  });

  page.drawText(invoice.fields['Invoice Number'], {
    x: 415,
    y: 748,
    size: 14,
    font: bold,
    color: rgb(0.84, 0.91, 1),
  });

  page.drawText('Payment Terms: Net 30', {
    x: 72,
    y: 695,
    size: 10,
    font: regular,
    color: rgb(0.26, 0.32, 0.4),
  });

  page.drawText('Please remit payment to the account listed in contract appendix B.', {
    x: 72,
    y: 680,
    size: 10,
    font: regular,
    color: rgb(0.26, 0.32, 0.4),
  });

  page.drawLine({
    start: { x: 72, y: 664 },
    end: { x: 540, y: 664 },
    thickness: 1,
    color: rgb(0.75, 0.79, 0.87),
  });

  let y = 632;
  for (const label of FIELD_ORDER) {
    page.drawText(`${label}:`, {
      x: 72,
      y,
      size: 12,
      font: bold,
      color: rgb(0.11, 0.14, 0.2),
    });

    page.drawText(String(invoice.fields[label]), {
      x: 220,
      y,
      size: 12,
      font: regular,
      color: rgb(0.08, 0.15, 0.25),
    });

    y -= 42;
  }

  page.drawLine({
    start: { x: 72, y: 198 },
    end: { x: 540, y: 198 },
    thickness: 1,
    color: rgb(0.75, 0.79, 0.87),
  });

  page.drawText('Thank you for your business.', {
    x: 72,
    y: 174,
    size: 11,
    font: regular,
    color: rgb(0.25, 0.3, 0.38),
  });

  const bytes = await pdfDoc.save();
  await writeFile(path.join(outputDir, invoice.fileName), bytes);
}

async function main() {
  await mkdir(outputDir, { recursive: true });

  const invoices = [];
  for (let i = 1; i <= 10; i += 1) {
    const invoice = buildInvoiceData(i);
    await createInvoicePdf(invoice);

    invoices.push({
      id: invoice.id,
      fileName: invoice.fileName,
      preview: {
        invoiceNumber: invoice.fields['Invoice Number'],
        vendorName: invoice.fields['Vendor Name'],
        clientName: invoice.fields['Client Name'],
        totalDue: invoice.fields['Total Due'],
        dueDate: invoice.fields['Due Date'],
      },
    });
  }

  const indexJson = {
    fieldOrder: FIELD_ORDER,
    invoices,
  };

  await writeFile(path.join(outputDir, 'index.json'), JSON.stringify(indexJson, null, 2));

  process.stdout.write(`Generated ${invoices.length} invoices in ${outputDir}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
