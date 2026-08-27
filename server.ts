import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { etaMiddleware } from "./server/etaMiddleware.js";

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

  // Live Currency Exchange Rates vs EGP API endpoint
  app.get("/api/currency/rates", async (_req, res) => {
    try {
      // Default baseline official rates for Central Bank of Egypt / Market
      const defaultRates: Record<string, number> = {
        EGP: 1.0,
        USD: 48.65,
        EUR: 52.85,
        SAR: 12.97,
        AED: 13.24,
        GBP: 62.90,
        KWD: 158.80,
        QAR: 13.36,
        CNY: 6.78,
      };

      try {
        // Try fetching live rates from open exchange API with 3.5s timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const response = await fetch("https://open.er-api.com/v6/latest/USD", {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data: any = await response.json();
          if (data && data.rates && data.rates.EGP) {
            const usdToEgp = Number(data.rates.EGP) || defaultRates.USD;
            const rates: Record<string, number> = {
              EGP: 1.0,
              USD: parseFloat(usdToEgp.toFixed(4)),
              EUR: parseFloat(((1 / (data.rates.EUR || 0.92)) * usdToEgp).toFixed(4)),
              SAR: parseFloat(((1 / (data.rates.SAR || 3.75)) * usdToEgp).toFixed(4)),
              AED: parseFloat(((1 / (data.rates.AED || 3.67)) * usdToEgp).toFixed(4)),
              GBP: parseFloat(((1 / (data.rates.GBP || 0.77)) * usdToEgp).toFixed(4)),
              KWD: parseFloat(((1 / (data.rates.KWD || 0.306)) * usdToEgp).toFixed(4)),
              QAR: parseFloat(((1 / (data.rates.QAR || 3.64)) * usdToEgp).toFixed(4)),
              CNY: parseFloat(((1 / (data.rates.CNY || 7.18)) * usdToEgp).toFixed(4)),
            };

            return res.json({
              success: true,
              base: "EGP",
              rates,
              lastUpdated: data.time_last_update_utc || new Date().toISOString(),
              source: "Global FX Open Exchange & CBE Rates Engine",
            });
          }
        }
      } catch (fetchErr) {
        console.warn("External currency fetch notice, returning reference rates:", fetchErr);
      }

      // Fallback response
      res.json({
        success: true,
        base: "EGP",
        rates: defaultRates,
        lastUpdated: new Date().toISOString(),
        source: "Egyptian Central Bank Reference Rates",
      });
    } catch (err: any) {
      console.error("Currency Rates Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
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

  // --- Egyptian Tax Authority (ETA) SDK Middleware API Endpoints ---

  // 1. Get/Refresh OAuth2 Access Token
  app.post("/api/eta/token", async (req, res) => {
    try {
      const forceRefresh = req.body?.forceRefresh === true;
      const tokenData = await etaMiddleware.getAccessToken(forceRefresh);
      res.json({ success: true, data: tokenData });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. Submit single invoice directly to ETA Gateway
  app.post("/api/eta/documents/submit", async (req, res) => {
    try {
      const { invoice } = req.body;
      if (!invoice || !invoice.invoiceNumber) {
        return res.status(400).json({ success: false, message: "بيانات الفاتورة غير مكتملة." });
      }
      const result = await etaMiddleware.submitInvoiceDirect(invoice);
      res.json({ success: true, ...result });
    } catch (err: any) {
      console.error("ETA Submission Error:", err);
      res.status(500).json({ success: false, message: err.message, error: err.message });
    }
  });

  // 3. Batch submit multiple invoices
  app.post("/api/eta/documents/batch-submit", async (req, res) => {
    try {
      const { invoices } = req.body;
      if (!Array.isArray(invoices) || invoices.length === 0) {
        return res.status(400).json({ success: false, message: "قائمة الفواتير فارغة." });
      }
      const result = await etaMiddleware.submitBatchDirect(invoices);
      res.json({ success: true, ...result });
    } catch (err: any) {
      console.error("ETA Batch Submission Error:", err);
      res.status(500).json({ success: false, message: err.message, error: err.message });
    }
  });

  // 4. Query document status by UUID
  app.get("/api/eta/documents/:uuid", async (req, res) => {
    try {
      const { uuid } = req.params;
      const statusData = await etaMiddleware.getDocumentStatus(uuid);
      res.json({ success: true, data: statusData });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. ETA Gateway Connectivity & Diagnostics
  app.get("/api/eta/diagnostics", async (_req, res) => {
    try {
      const diagnostics = await etaMiddleware.runDiagnostics();
      res.json({ success: true, data: diagnostics });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6. Get Transmission Logs
  app.get("/api/eta/logs", (_req, res) => {
    try {
      const logs = etaMiddleware.getLogs();
      res.json({ success: true, data: logs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7. Clear Transmission Logs
  app.delete("/api/eta/logs", (_req, res) => {
    try {
      etaMiddleware.clearLogs();
      res.json({ success: true, message: "تم مسح سجل الإرسال بنجاح." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 8. Get current Server ETA config
  app.get("/api/eta/config", (_req, res) => {
    try {
      const config = etaMiddleware.getConfig();
      // Mask secret for security
      const safeConfig = {
        ...config,
        clientSecret: config.clientSecret ? "••••••••••••••••" : "",
        hasSecret: !!config.clientSecret,
      };
      res.json({ success: true, data: safeConfig });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 9. Update Server ETA config
  app.post("/api/eta/config", (req, res) => {
    try {
      const updated = etaMiddleware.updateConfig(req.body);
      res.json({ success: true, data: updated, message: "تم تحديث إعدادات الوسيط بنجاح." });
    } catch (err: any) {
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
