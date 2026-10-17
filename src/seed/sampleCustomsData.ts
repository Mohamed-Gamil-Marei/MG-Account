export const SAMPLE_HS_CODES = [
  { hsCode: '84713000', descriptionAr: 'أجهزة حاسب آلي محمولة (لابتوب)', dutyRatePercent: 5, vatRatePercent: 14 },
  { hsCode: '85171200', descriptionAr: 'أجهزة هاتف محمول بشبكات خلوي', dutyRatePercent: 10, vatRatePercent: 14 },
  { hsCode: '87032300', descriptionAr: 'سيارات ركوب خاصة 1600 سيسي', dutyRatePercent: 40, vatRatePercent: 14 },
  { hsCode: '30049090', descriptionAr: 'أدوية ومستحضرات صيدلانية معالجة', dutyRatePercent: 2, vatRatePercent: 0 },
];

export const SAMPLE_CUSTOMS_SHIPMENTS = [
  {
    id: 'shipment-1',
    declarationNo: '48291/2026',
    portName: 'ميناء الإسكندرية البحري',
    importerName: 'شركة المصرية للاستيراد والتصدير',
    importerTaxNo: '120-489-321',
    hsCode: '84713000',
    goodsDescription: 'شحنة أجهزة كمبيوتر لابتوب عدد 200 جهاز',
    cifEgpAmount: 2261250,
    customsDutyRate: 5,
    customsDutyAmount: 113062.5,
    vatRate: 14,
    vatAmount: 332403.75,
    withholdingTaxRate: 1,
    withholdingTaxAmount: 22612.5,
    totalCustomsDutiesAndTaxes: 468078.75,
    status: 'CLEARED',
    releaseDate: '2026-10-10',
  },
];
