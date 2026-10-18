import { Invoice } from '../types';
import { getCairoTimestamp } from './cairoTime';

export interface EtaSignedPayloadResult {
  payload: Record<string, unknown>;
  signatureHash: string;
}

class EtaSdkEngine {
  public generateFullSignedPayload(invoice: Invoice): EtaSignedPayloadResult {
    const issuedAt = getCairoTimestamp();
    const payload: Record<string, unknown> = {
      issuer: {
        type: 'B',
        id: '233519890',
        name: 'المنشأة المصدرة',
      },
      receiver: {
        type: invoice.receiverType || 'B',
        id: invoice.partnerTaxId || '',
        name: invoice.partnerName,
      },
      documentType: invoice.documentType || 'I',
      documentTypeVersion: '1.0',
      dateTimeIssued: issuedAt,
      taxpayerActivityCode: '6920',
      internalID: invoice.invoiceNumber,
      invoiceLines: invoice.items.map((item) => ({
        description: item.description,
        itemType: 'EGS',
        itemCode: item.itemCode,
        unitType: item.unitType || 'EA',
        quantity: item.quantity,
        unitValue: {
          currencySold: invoice.currency || 'EGP',
          amountEGP: item.unitPrice,
        },
        salesTotal: item.quantity * item.unitPrice,
        netTotal: item.totalBeforeTax,
        total: item.netTotal,
      })),
      totalSalesAmount: invoice.subtotal,
      totalDiscountAmount: invoice.totalDiscount,
      netAmount: invoice.subtotal - invoice.totalDiscount,
      totalAmount: invoice.grandTotal,
    };

    return {
      payload,
      signatureHash: `CADES-BES-${invoice.invoiceNumber}`,
    };
  }

  public generateReceiptPayload(invoice: Invoice): Record<string, unknown> {
    return {
      header: {
        dateTimeIssued: getCairoTimestamp(),
        receiptNumber: invoice.invoiceNumber,
        uuid: invoice.etaUuid || `REC-${invoice.id}`,
        currency: invoice.currency || 'EGP',
      },
      buyer: {
        type: 'P',
        name: invoice.partnerName,
      },
      itemData: invoice.items,
      totalSales: invoice.subtotal,
      netAmount: invoice.subtotal - invoice.totalDiscount,
      totalAmount: invoice.grandTotal,
    };
  }

  public generateEtaXml(invoice: Invoice): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <ID>${invoice.invoiceNumber}</ID>
  <IssueDate>${invoice.date}</IssueDate>
  <DocumentCurrencyCode>${invoice.currency || 'EGP'}</DocumentCurrencyCode>
  <AccountingCustomerParty>
    <PartyName>${invoice.partnerName}</PartyName>
  </AccountingCustomerParty>
  <LegalMonetaryTotal>
    <TaxExclusiveAmount currencyID="EGP">${invoice.subtotal - invoice.totalDiscount}</TaxExclusiveAmount>
    <TaxInclusiveAmount currencyID="EGP">${invoice.grandTotal}</TaxInclusiveAmount>
    <PayableAmount currencyID="EGP">${invoice.grandTotal}</PayableAmount>
  </LegalMonetaryTotal>
</Invoice>`;
  }
}

export const etaService = new EtaSdkEngine();
