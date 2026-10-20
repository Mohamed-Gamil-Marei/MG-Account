import { Invoice } from '../types';
import { getCairoTimestamp } from './cairoTime';

export const ETA_SIMULATED_SIGNATURE_NOTICE =
  'محاكاة (غير موقّعة) — الإصدار الفعلي يتم من بوابة ETA بالتوكن';

export interface EtaSignedPayloadResult {
  payload: Record<string, unknown>;
  signatureSimulated: true;
  signatureNotice: string;
  signatureHash: string;
}

class EtaSdkEngine {
  /**
   * توليد هيكل JSON للمعاينة والتصدير المحلي فقط.
   * محاكاة (غير موقّعة) — الإصدار الفعلي يتم من بوابة ETA بالتوكن.
   * لا يوجد إصدار أو توقيع فعلي في البرنامج.
   */
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
      signatureSimulated: true,
      signatureNotice: ETA_SIMULATED_SIGNATURE_NOTICE,
    };

    return {
      payload,
      signatureSimulated: true,
      signatureNotice: ETA_SIMULATED_SIGNATURE_NOTICE,
      signatureHash: ETA_SIMULATED_SIGNATURE_NOTICE,
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
      signatureSimulated: true,
      signatureNotice: ETA_SIMULATED_SIGNATURE_NOTICE,
    };
  }

  public generateEtaXml(invoice: Invoice): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!-- ${ETA_SIMULATED_SIGNATURE_NOTICE} -->
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <ID>${invoice.invoiceNumber}</ID>
  <IssueDate>${invoice.date}</IssueDate>
  <DocumentCurrencyCode>${invoice.currency || 'EGP'}</DocumentCurrencyCode>
  <Note>${ETA_SIMULATED_SIGNATURE_NOTICE}</Note>
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
