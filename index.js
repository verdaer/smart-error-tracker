// server/index.js

const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB Bağlantısı
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart-tracker')
    .then(() => console.log("📦 MongoDB bağlantısı başarılı."))
    .catch(err => console.error("📦 MongoDB bağlantı hatası:", err));

// MongoDB için Error Modeli
const ErrorSchema = new mongoose.Schema({
    message: String,
    stack: String,
    type: String,
    apiKey: String,
    aiAnalysis: String,
    createdAt: { type: Date, default: Date.now }
});
const ErrorModel = mongoose.model('Error', ErrorSchema);

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. ADIM: AI FONKSİYONU VE DÜZENLENMİŞ PROMPT ---
// server/index.js

// 1. Tanımlama kısmında gerekirse API versiyonunu belirtmeyin (varsayılana bırakın)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function analyzeError(message, stack) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        // Kullanıcının istediği spesifik prompt
        const prompt = `Sen bir kıdemli yazılımcısın. Şu hatayı analiz et, kök nedenini bul ve düzeltilmiş kod bloğunu ver.
Hata: ${message}
Döküm: ${stack}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("AI Analiz Hatası Detayı:", error.message);
        // Eğer hala 404 veriyorsa, alternatif olarak "gemini-pro" dene
        return "AI analizi şu an yapılamıyor. Lütfen sistem yöneticisine danışın.";
    }
}


// --- 2. ADIM: DISCORD / SLACK "INSTANT ALERTS" ---
async function sendDiscordAlert(errorType, message, aiAnalysis) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
        console.warn("⚠️ DISCORD_WEBHOOK_URL .env dosyasında bulunamadı! Alert gönderilmedi.");
        return;
    }

    const payload = {
        embeds: [{
            title: `🔴 Hata: ${errorType}`,
            description: `**Mesaj:** ${message}\n\n🧠 **AI Analizi:**\n${aiAnalysis}`,
            color: 0xff0000 // Kırmızı renk
        }]
    };

    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        console.log("✅ Hata Discord'a iletildi.");
    } catch (err) {
        console.error("❌ Discord'a mesaj gönderilemedi:", err);
    }
}

// --- 3. ADIM: HAVA TRAFİĞİ (WEBHOOK / API) ---
// Frontend / SDK'dan gelen hatalar
app.post('/report', async (req, res) => {
    const { message, stack, type = 'Uygulama Hatası' } = req.body;
    const apiKey = req.headers['x-api-key'] || 'Bilinmiyor';
    
    console.log("🛸 Hata havada yakalandı, AI analizine uçuruluyor...");

    try {
        // 1. Zeka Katmanı: Gemini ile Analiz Et
        const solution = await analyzeError(message, stack);

        // 2. Veritabanına Kaydet
        const errorRecord = new ErrorModel({
            message,
            stack,
            type,
            apiKey,
            aiAnalysis: solution
        });
        await errorRecord.save();
        console.log("💾 Hata başarıyla MongoDB'ye kaydedildi.");

        // 3. Instant Alerts: Discord'a Gönder (Ağır veritabanı yoruculuğu yok)
        await sendDiscordAlert(type, message, solution);

        res.status(200).json({ success: true, message: "Hata yakalandı, kaydedildi, analiz edildi ve bildirildi." });
    } catch (err) {
        console.error("Hata işlenirken sorun oluştu:", err);
        res.status(500).json({ error: "Sunucu hatası" });
    }
});

// --- 4. ADIM: UYGULAMA İÇİ HATA YAKALAYICI (INTERCEPTOR / MIDDLEWARE) ---
// Backend'de (Node.js tarafında) oluşan hataları yakalayan global middleware ajan.
// Test etmek için bir route
app.get('/test-error', (req, res) => {
    throw new Error("Bu, backend ara katmanını (middleware) test etmek için fırlatılan bilerek yapılmış bir hatadır.");
});

// Global Error Handler Middleware
app.use(async (err, req, res, next) => {
    console.error("🕷️ Backend Interceptor Hatayı Yakaladı:", err.message);
    
    try {
        const solution = await analyzeError(err.message, err.stack);
        
        // Veritabanına kaydet
        const errorRecord = new ErrorModel({
            message: err.message,
            stack: err.stack,
            type: err.name || "Backend Hatası",
            aiAnalysis: solution
        });
        await errorRecord.save();
        console.log("💾 Backend Hatası MongoDB'ye kaydedildi.");

        await sendDiscordAlert(err.name || "Backend Hatası", err.message, solution);
    } catch (aiErr) {
        console.error("AI/DB işlemleri sırasında hata:", aiErr);
    }

    res.status(500).json({ error: "İç sunucu hatası, mühendislerimiz (ve AI) bilgilendirildi." });
});

// --- 5. ADIM: DASHBOARD İÇİN API (/all-errors) ---
app.get('/all-errors', async (req, res) => {
    try {
        const errors = await ErrorModel.find().sort({ createdAt: -1 });
        res.json(errors);
    } catch (err) {
        res.status(500).json({ error: "Hatalar alınırken sorun oluştu" });
    }
});

app.listen(3000, () => console.log("Smart Tracker Server 3000 portunda hazır!"));