import { pdfjs } from 'react-pdf';
import type { ExtractionResult, ExtractedField, InvoicePreview, PageSize } from '../types';

interface NormalizedItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const Y_TOLERANCE = 1.6;

export function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function sanitizeLabel(label: string): string {
  return label.replace(/\s+/g, ' ').replace(/[:\s]+$/g, '').trim();
}

function normalizeTextItems(textContent: { items: unknown[] }): NormalizedItem[] {
  return textContent.items
    .filter((item): item is { str: string; transform: number[]; width?: number; height?: number } => {
      return !!item && typeof item === 'object' && typeof (item as { str?: unknown }).str === 'string'
        && Array.isArray((item as { transform?: unknown }).transform);
    })
    .map((item) => ({
      str: item.str.trim(),
      x: item.transform[4] ?? 0,
      y: item.transform[5] ?? 0,
      width: item.width ?? 0,
      height: item.height ?? (Math.abs(item.transform[3] ?? 12) || 12),
    }))
    .filter((item) => item.str.length > 0);
}

function findValueOnSameRow(items: NormalizedItem[], labelItem: NormalizedItem, labelText: string): NormalizedItem | null {
  return items
    .filter(
      (item) =>
        item.str !== labelText
        && item.x >= labelItem.x + labelItem.width - 1
        && Math.abs(item.y - labelItem.y) <= Y_TOLERANCE,
    )
    .sort((a, b) => a.x - b.x)[0] ?? null;
}

function extractFromOrderedLabels(items: NormalizedItem[], fieldOrder: string[]): ExtractedField[] {
  const fields: ExtractedField[] = [];

  for (const rawLabel of fieldOrder) {
    const label = sanitizeLabel(rawLabel);
    const labelText = `${label}:`;
    const labelItem = items.find((item) => item.str === labelText);

    if (!labelItem) {
      continue;
    }

    const valueItem = findValueOnSameRow(items, labelItem, labelText);
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

  return fields;
}

function extractGenericFields(items: NormalizedItem[]): ExtractedField[] {
  const fields: ExtractedField[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const inlineMatch = item.str.match(/^([^:]{2,48}):\s+(.+)$/);
    if (inlineMatch) {
      const label = sanitizeLabel(inlineMatch[1]);
      const value = inlineMatch[2].trim();
      const key = `${label}:${value}`;

      if (!label || !value || seen.has(key)) {
        continue;
      }

      const ratio = Math.min(0.92, Math.max(0.25, value.length / item.str.length));
      const width = Math.max(24, item.width * ratio);

      fields.push({
        id: `${slugify(label)}-${fields.length}`,
        label,
        value,
        bbox: {
          x: item.x + item.width - width,
          y: item.y,
          width,
          height: item.height,
        },
      });

      seen.add(key);
      continue;
    }

    if (!item.str.endsWith(':')) {
      continue;
    }

    const label = sanitizeLabel(item.str);
    if (!label) {
      continue;
    }

    const valueItem = findValueOnSameRow(items, item, item.str);
    if (!valueItem) {
      continue;
    }

    const key = `${label}:${valueItem.str}`;
    if (seen.has(key)) {
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

    seen.add(key);
  }

  return fields
    .sort((a, b) => b.bbox.y - a.bbox.y || a.bbox.x - b.bbox.x)
    .slice(0, 16);
}

function looksLikeInvoice(items: NormalizedItem[]): boolean {
  const text = items.map((item) => item.str.toLowerCase()).join(' ');

  const keywords = [
    'invoice',
    'invoice number',
    'invoice date',
    'due date',
    'subtotal',
    'tax',
    'total',
    'bill to',
    'vendor',
    'client',
  ];

  const score = keywords.filter((term) => text.includes(term)).length;
  return text.includes('invoice') && score >= 3;
}

export async function extractInvoiceFields(pdfSource: string | Uint8Array, fieldOrder: string[]): Promise<ExtractionResult> {
  const task = typeof pdfSource === 'string'
    ? pdfjs.getDocument(pdfSource)
    : pdfjs.getDocument({ data: pdfSource });

  const pdf = await task.promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  const textContent = await page.getTextContent();
  const items = normalizeTextItems(textContent);

  const orderedFields = fieldOrder.length > 0 ? extractFromOrderedLabels(items, fieldOrder) : [];
  const fields = orderedFields.length >= 3 ? orderedFields : extractGenericFields(items);

  return {
    numPages: pdf.numPages,
    fields,
    pageSize: {
      width: viewport.width,
      height: viewport.height,
    },
    isLikelyInvoice: looksLikeInvoice(items),
  };
}

function findFieldValue(fields: ExtractedField[], aliases: string[]): string {
  for (const alias of aliases) {
    const match = fields.find((field) => field.label.toLowerCase() === alias.toLowerCase());
    if (match) {
      return match.value;
    }
  }

  return '';
}

export function buildPreview(fields: ExtractedField[], fallbackName: string): InvoicePreview {
  return {
    invoiceNumber: findFieldValue(fields, ['Invoice Number', 'Invoice #']) || fallbackName,
    vendorName: findFieldValue(fields, ['Vendor Name', 'From', 'Company']) || 'Uploaded invoice',
    clientName: findFieldValue(fields, ['Client Name', 'Bill To', 'Customer']) || 'Unknown client',
    totalDue: findFieldValue(fields, ['Total Due', 'Total', 'Amount Due']) || 'Total unavailable',
    dueDate: findFieldValue(fields, ['Due Date', 'Payment Due']) || 'Due date unavailable',
  };
}

export function toOverlayStyle(
  bbox: ExtractedField['bbox'],
  pageSize: PageSize,
  scale: number,
): { left: number; top: number; width: number; height: number } {
  const horizontalPad = 10;
  const verticalPad = 5;
  const left = Math.max(0, bbox.x * scale - horizontalPad);
  const top = Math.max(0, (pageSize.height - bbox.y - bbox.height) * scale - verticalPad);

  return {
    left,
    top,
    width: Math.max(bbox.width * scale + horizontalPad * 2, 44),
    height: Math.max(bbox.height * scale + verticalPad * 2, 26),
  };
}
