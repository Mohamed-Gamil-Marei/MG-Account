export interface HsCodeRecord {
  hsCode: string;
  code: string;
  descriptionAr: string;
  titleAr: string;
  titleEn: string;
  dutyRatePercent: number;
  dutyRatePct: number;
  vatRatePercent: number;
  vatRatePct: number;
  regulatoryAuthority: string;
}

export const SAMPLE_HS_CODES: HsCodeRecord[] = [
  {
    hsCode: '84713000',
    code: '84713000',
    descriptionAr: 'أجهزة حاسب آلي محمولة (لابتوب)',
    titleAr: 'أجهزة حاسب آلي محمولة (لابتوب)',
    titleEn: 'Portable Automatic Data Processing Machines',
    dutyRatePercent: 5,
    dutyRatePct: 5,
    vatRatePercent: 14,
    vatRatePct: 14,
    regulatoryAuthority: 'الهيئة العامة للرقابة على الصادرات والواردات',
  },
  {
    hsCode: '85171200',
    code: '85171200',
    descriptionAr: 'أجهزة هاتف محمول بشبكات خلوي',
    titleAr: 'أجهزة هاتف محمول بشبكات خلوي',
    titleEn: 'Mobile Cellular Telephones',
    dutyRatePercent: 10,
    dutyRatePct: 10,
    vatRatePercent: 14,
    vatRatePct: 14,
    regulatoryAuthority: 'الجهاز القومي لتنظيم الاتصالات NTRA',
  },
  {
    hsCode: '87032300',
    code: '87032300',
    descriptionAr: 'سيارات ركوب خاصة 1600 سيسي',
    titleAr: 'سيارات ركوب خاصة 1600 سيسي',
    titleEn: 'Motor Cars Cylinder Capacity 1600cc',
    dutyRatePercent: 40,
    dutyRatePct: 40,
    vatRatePercent: 14,
    vatRatePct: 14,
    regulatoryAuthority: 'الإدارة العامة للمرور وهيئة التنمية الصناعية',
  },
  {
    hsCode: '30049090',
    code: '30049090',
    descriptionAr: 'أدوية ومستحضرات صيدلانية معالجة',
    titleAr: 'أدوية ومستحضرات صيدلانية معالجة',
    titleEn: 'Medicaments for Therapeutic Uses',
    dutyRatePercent: 2,
    dutyRatePct: 2,
    vatRatePercent: 0,
    vatRatePct: 0,
    regulatoryAuthority: 'هيئه الدواء المصرية EDA',
  },
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
