import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (err) {
      console.warn("Gemini client initialization error:", err);
    }
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      system: "منظومة المحاسب والمراجع القانوني - محمد جميل مرعي",
      time: new Date().toISOString(),
    });
  });

  // Smart Egyptian Accounting AI Assistant endpoint (suggesting journal entries, audit insights, tax analysis)
  app.post("/api/ai/suggest-entry", async (req, res) => {
    try {
      const { description, amount, context } = req.body;
      const ai = getAI();
      if (!ai) {
        return res.json({
          success: false,
          fallback: true,
          message: "API Key not configured, using local rule-based accounting engine",
        });
      }

      const prompt = `أنت خبير ومستشار محاسبي مصري تعمل لصالح مكتب المحاسب القانوني ومراقب الحسابات "محمد جميل مرعي".
المطلوب: تحليل العملية المالية التالية واقتراح قيد اليومية وفقاً للنظام المحاسبي المصري الموحد والمعايير المحاسبية المصرية (EAS)، مع مراعاة الضرائب المصرية (ضريبة القيمة المضافة 14%، ضريبة الخصم والتحصيل أ.ت.ص إذا انطبقت).

البيان: "${description || ''}"
المبلغ الإجمالي / الأساسي: ${amount || 0} ج.م
سياق إضافي: ${context || ''}

أجب فقط بصيغة JSON نظيفة بدون أي Markdown formatting أو كود خارجي:
{
  "explanation": "شرح مبسط ومهني لطبيعة القيد والأساس المحاسبي المصري",
  "entries": [
    { "accountCode": "كود الحساب التقريبي", "accountName": "اسم الحساب بالدليل المصري", "debit": 0, "credit": 0, "notes": "ملاحظات السطر" }
  ],
  "taxNotes": "توجيهات ضريبية خاصة بالعملية (قيمة مضافة أو خصم أو كسب عمل إن وجد)"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text || "{}";
      const parsed = JSON.parse(text);
      res.json({ success: true, data: parsed });
    } catch (err: any) {
      console.error("AI Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Credit Financial Statement AI Distribution Assistant (توزيع النسب المالية لمبيعات مستهدفة)
  app.post("/api/ai/distribute-financials", async (req, res) => {
    try {
      const { targetSales, industry, targetNetProfitMargin } = req.body;
      const ai = getAI();
      if (!ai) {
        return res.json({ success: false, fallback: true });
      }

      const prompt = `أنت خبير ائتمان ومراجع حسابات قانوني مصري.
المطلوب إعداد محاكاة وتوزيع لقوائم مالية (دخل ومركز مالي) لملف ائتمان بنكي بناءً على حجم مبيعات مستهدف: ${targetSales} ج.م
النشاط: ${industry || 'تجاري / صناعي / خدمي'}
هامش صافي الربح المستهدف التقريبي: ${targetNetProfitMargin || '8% - 15%'}

قم بإنشاء أرقام متوازنة محاسبياً تماماً (الأصول = الالتزامات + حقوق الملكية) مع نسب مالية مقبولة لدى البنوك المصرية (نسبة السيولة، معدل دوران المخزون، نسبة الرافعة المالية، مجمل الربح، المصروفات البيعية والعمومية).

أجب بصيغة JSON نقية:
{
  "sales": ${targetSales},
  "costOfGoodsSold": 0,
  "grossProfit": 0,
  "operatingExpenses": 0,
  "ebitda": 0,
  "depreciation": 0,
  "interestExpenses": 0,
  "taxExpense": 0,
  "netProfit": 0,
  "currentAssets": {
    "cash": 0,
    "receivables": 0,
    "inventory": 0,
    "otherCurrentAssets": 0,
    "total": 0
  },
  "nonCurrentAssets": {
    "fixedAssetsNet": 0,
    "otherAssets": 0,
    "total": 0
  },
  "totalAssets": 0,
  "currentLiabilities": {
    "payables": 0,
    "shortTermLoans": 0,
    "taxAccruals": 0,
    "otherLiabilities": 0,
    "total": 0
  },
  "longTermLiabilities": {
    "longTermDebt": 0,
    "total": 0
  },
  "equity": {
    "paidUpCapital": 0,
    "legalReserve": 0,
    "retainedEarnings": 0,
    "currentYearNetProfit": 0,
    "total": 0
  },
  "totalLiabilitiesAndEquity": 0,
  "financialRatios": {
    "grossMargin": "نسبة مئوية",
    "netMargin": "نسبة مئوية",
    "currentRatio": "معامل السيولة المتداولة",
    "debtToEquity": "نسبة الرافعة المالية"
  },
  "auditorNotes": "رأي وملاحظات المراجع القانوني للائتمان"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text || "{}";
      const parsed = JSON.parse(text);
      res.json({ success: true, data: parsed });
    } catch (err: any) {
      console.error("AI Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Office Accounting & Auditing System running on http://localhost:${PORT}`);
  });
}

startServer();
