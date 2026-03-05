import { useEffect, useRef, useState } from 'react';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import {
  Box,
  Card,
  CardActionArea,
  Chip,
  IconButton,
  Typography,
} from '@mui/material';
import type { InvoiceCardData } from '../types';

interface InvoiceCarouselProps {
  invoices: InvoiceCardData[];
  selectedInvoiceId: string | null;
  onSelectInvoice: (id: string) => void;
}

export default function InvoiceCarousel({
  invoices,
  selectedInvoiceId,
  onSelectInvoice,
}: InvoiceCarouselProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) {
      return undefined;
    }

    const update = () => {
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };

    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [invoices.length]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || !selectedInvoiceId) {
      return;
    }

    const selectedCard = el.querySelector<HTMLElement>(`[data-invoice-id="${selectedInvoiceId}"]`);
    if (!selectedCard) {
      return;
    }

    selectedCard.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });

    const actionArea = selectedCard.querySelector<HTMLElement>('.MuiCardActionArea-root');
    actionArea?.focus({ preventScroll: true });
  }, [selectedInvoiceId, invoices]);

  return (
    <Box className="carousel-wrap">
      <IconButton
        className="carousel-arrow left"
        onClick={() => trackRef.current?.scrollBy({ left: -260, behavior: 'smooth' })}
        disabled={!canScrollLeft}
        aria-label="Scroll invoices left"
        sx={{
          position: 'absolute',
          left: 2,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 3,
        }}
      >
        <ChevronLeftRoundedIcon />
      </IconButton>

      <Box className="invoice-carousel" ref={trackRef} role="tablist" aria-label="Invoice selector">
        {invoices.map((invoice) => {
          const selected = selectedInvoiceId === invoice.id;

          return (
            <Card
              key={invoice.id}
              className={`invoice-card ${selected ? 'selected' : ''} ${invoice.isUserUpload ? 'uploaded' : ''}`}
              variant="outlined"
              sx={{ overflow: 'visible' }}
              data-invoice-id={invoice.id}
            >
              <CardActionArea
                onClick={() => onSelectInvoice(invoice.id)}
                sx={{
                  height: '100%',
                  alignItems: 'stretch',
                  textAlign: 'left',
                  p: 1,
                }}
              >
                {invoice.isUserUpload ? (
                  <Chip
                    icon={<AutoAwesomeRoundedIcon sx={{ fontSize: '0.78rem !important' }} />}
                    label="New"
                    size="small"
                    className="new-badge"
                  />
                ) : null}

                <Typography className={`invoice-id ${invoice.preview.invoiceNumber.length > 24 ? 'compact' : ''}`}>
                  {invoice.preview.invoiceNumber}
                </Typography>
                <Typography className={`invoice-row ${invoice.preview.vendorName.length > 24 ? 'compact' : ''}`}>
                  {invoice.preview.vendorName}
                </Typography>
                <Typography className={`invoice-row ${invoice.preview.clientName.length > 24 ? 'compact' : ''}`}>
                  Client: {invoice.preview.clientName}
                </Typography>
                <Box className="invoice-bottom-row">
                  <span>{invoice.preview.totalDue}</span>
                  <span>Due {invoice.preview.dueDate}</span>
                </Box>
              </CardActionArea>
            </Card>
          );
        })}
      </Box>

      <IconButton
        className="carousel-arrow right"
        onClick={() => trackRef.current?.scrollBy({ left: 260, behavior: 'smooth' })}
        disabled={!canScrollRight}
        aria-label="Scroll invoices right"
        sx={{
          position: 'absolute',
          right: 2,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 3,
        }}
      >
        <ChevronRightRoundedIcon />
      </IconButton>
    </Box>
  );
}
