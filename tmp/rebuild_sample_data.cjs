const fs = require('fs');

const content = fs.readFileSync('dist/assets/index-DcmCzKRd.js', 'utf8');

function extractLiteral(startIndex) {
  const startChar = content[startIndex];
  const endChar = startChar === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let stringChar = '';
  let escape = false;

  for (let i = startIndex; i < content.length; i++) {
    const ch = content[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (inString) {
      if (ch === stringChar) {
        inString = false;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inString = true;
      stringChar = ch;
      continue;
    }
    if (ch === startChar) {
      depth++;
    } else if (ch === endChar) {
      depth--;
      if (depth === 0) {
        return content.substring(startIndex, i + 1);
      }
    }
  }
  throw new Error('Could not find matching end character for ' + startChar);
}

const map = {
  DEFAULT_OFFICE_PROFILE: content.indexOf('{firmName:"مكتب المحاسب'),
  DEFAULT_CLIENT_FOLDERS: content.indexOf('[{id:"fld-legal",'),
  SAMPLE_CLIENTS: content.indexOf('[{id:"cl-1",clientCode:"CL-0101"'),
  SAMPLE_JOURNAL_ENTRIES: content.indexOf('[{id:"je-1",entryNumber:1'),
  SAMPLE_TREASURY_TRANSACTIONS: content.indexOf('[{id:"tr-0",voucherNumber:"TR-2026-0004"'),
  SAMPLE_TAX_DECLARATIONS: content.indexOf('[{id:"tax-1",declarationType:"VAT_10"'),
  SAMPLE_TAX_MANDATES: content.indexOf('[{id:"mand-1",mandateCode:"TAX-MAND-2026-001"'),
  SAMPLE_CERTIFICATES: content.indexOf('[{id:"cert-1",certificateNumber:"CERT-2026-0041"'),
  SAMPLE_INVOICES: content.indexOf('[{id:"inv-1",invoiceNumber:"INV-2026-0101"'),
  SAMPLE_FEASIBILITY_STUDY: content.indexOf('{id:"fs-1",studyCode:"FS-2026-001"'),
  SAMPLE_CREDIT_SIMULATION: content.indexOf('{id:"credit-sim-1",modelName:"نموذج محاكاة ائتماني'),
  SAMPLE_SYSTEM_USERS: '[]',
  SAMPLE_FIXED_ASSETS: content.indexOf('[{id:"ast-001",assetCode:"AST-2024-001"'),
  SAMPLE_WHATSAPP_MESSAGES: content.indexOf('[{id:"wa-msg-101",clientId:"cl-1"'),
  DEFAULT_WHATSAPP_BOT_SETTINGS: content.indexOf('{isAutoReplyEnabled:!0,officeWorkingHours:'),
  SAMPLE_FEE_ESTIMATES: content.indexOf('[{id:"quo-001",quotationNumber:"QUO-2026-1045"')
};

let output = `// Auto-generated sampleData.ts
import type {
  OfficeProfile,
  ClientFolder,
  ClientArchiveRecord,
  JournalEntry,
  OfficeTreasuryTransaction,
  TaxDeclarationRecord,
  TaxMandateTask,
  ProfessionalCertificate,
  Invoice,
  FeasibilityStudy,
  CreditSimulation,
  FixedAssetRecord,
  WhatsAppChatMessage,
  WhatsAppBotSettings,
  FeeEstimateRecord
} from '../types';

`;

for (const [key, val] of Object.entries(map)) {
  let lit;
  if (val === '[]') {
    lit = '[]';
  } else {
    lit = extractLiteral(val);
  }
  output += `export const ${key}: any = ${lit};\n\n`;
}

fs.writeFileSync('src/data/sampleData.ts', output, 'utf8');
console.log('Successfully wrote src/data/sampleData.ts! Total length:', output.length);
