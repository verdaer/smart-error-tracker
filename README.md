# 🚀 Smart Error Tracker

Projelerinizdeki hataları anında yakalayan, **Google Gemini AI** ile kök nedenini analiz edip çözen ve **Discord'a** anlık bildirim atan hafif bir hata takip sistemidir.

### 🛠️ Kurulum ve Çalıştırma
1. Projeyi indirin ve `npm install` ile paketleri yükleyin.
2. `.env.example` dosyasını kopyalayıp adını `.env` yapın ve API şifrelerinizi girin.
3. `npm start` ile sunucuyu başlatın.

### 🌐 Uygulamanıza Ekleyin
Frontend'deki hataları yakalamak için sitenize bu kodu ekleyin:
```html
<script src="https://sunucu-adresiniz.com/sdk/tracker.js"></script>
<script>new SmartTracker("API_ANAHTARINIZ");</script>
```
Hataları incelemek için **`dashboard.html`** sayfasını kullanabilirsiniz.
