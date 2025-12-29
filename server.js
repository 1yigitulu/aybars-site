require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const jwt = require('jsonwebtoken'); 

// JWT Ayarı
const JWT_SECRET = process.env.JWT_SECRET || 'cok-gizli-ve-guclu-bir-sifre-belirle'; 

// Modeller
const Product = require('./models/Product');
const Order = require('./models/Order');
const User = require('./models/Uye');

const app = express();

// --- AYARLAR ---
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(__dirname));

// --- GÜVENLİK KONTROLÜ (MIDDLEWARE) ---
const adminKontrol = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ message: 'Erişim reddedildi. Giriş yapmalısınız.' });

    try {
        const temizToken = token.replace('Bearer ', '');
        const dogrulanmis = jwt.verify(temizToken, JWT_SECRET);
        
        if (dogrulanmis.isAdmin) {
            req.user = dogrulanmis;
            next();
        } else {
            res.status(403).json({ message: 'Bu işlem için yetkiniz yok!' });
        }
    } catch (err) {
        res.status(400).json({ message: 'Geçersiz Token.' });
    }
};

// --- CLOUDINARY AYARLARI ---
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// --- VERİTABANI ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Bağlandı!'))
  .catch(err => console.error('Bağlantı Hatası:', err));

// --- YARDIMCI: RESİM YÜKLEME ---
async function resmiCloudinaryeYukle(veri) {
    if (veri && veri.startsWith('data:image')) {
        try {
            const uploadResponse = await cloudinary.uploader.upload(veri, { folder: 'aybars_mobilya' });
            return uploadResponse.secure_url;
        } catch (error) {
            console.error("Resim yükleme hatası:", error);
            return null;
        }
    }
    return veri;
}

// --- KUPON MODELİ ---
const CouponSchema = new mongoose.Schema({
    kod: String,
    oran: Number,
    bitisTarihi: Number
});
const Coupon = mongoose.model('Coupon', CouponSchema);


// --- API ROTALARI ---

// 1. ÜRÜNLERİ GETİR (Herkese Açık)
app.get('/api/products', async (req, res) => {
    try {
        let query = {};
        if (req.query.kategori && req.query.kategori !== 'hepsi') query.kategori = req.query.kategori;
        const products = await Product.find(query).sort({ olusturulmaTarihi: -1 });
        res.json(products);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// 2. PUBLIC ÜRÜNLER (HAFİF)
app.get('/api/products/public', async (req, res) => {
    try {
        let query = {};
        if (req.query.kategori && req.query.kategori !== 'hepsi') query.kategori = req.query.kategori;
        const products = await Product.find(query).select('-aciklama -stokDetaylari').sort({ olusturulmaTarihi: -1 });
        
        const optimized = products.map(p => {
            let hafifRenkler = {};
            if (p.renkDetaylari) {
                Object.keys(p.renkDetaylari).forEach(r => {
                    if (Array.isArray(p.renkDetaylari[r]) && p.renkDetaylari[r].length > 0) {
                        hafifRenkler[r] = [ p.renkDetaylari[r][0] ];
                    }
                });
            }
            return { ...p._doc, renkDetaylari: hafifRenkler };
        });
        res.json(optimized);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// 3. TEK ÜRÜN
app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Bulunamadı' });
        res.json(product);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// 4. YENİ ÜRÜN EKLE (Sadece Admin)
app.post('/api/products', adminKontrol, async (req, res) => {
    try {
        let urunVerisi = req.body;
        if(urunVerisi.resim1) urunVerisi.resim1 = await resmiCloudinaryeYukle(urunVerisi.resim1);
        if(urunVerisi.resim2) urunVerisi.resim2 = await resmiCloudinaryeYukle(urunVerisi.resim2);

        if (urunVerisi.renkDetaylari) {
            for (const renk of Object.keys(urunVerisi.renkDetaylari)) {
                const resimDizisi = urunVerisi.renkDetaylari[renk];
                if (Array.isArray(resimDizisi)) {
                    urunVerisi.renkDetaylari[renk] = await Promise.all(
                        resimDizisi.map(async (img) => await resmiCloudinaryeYukle(img))
                    );
                }
            }
        }
        const product = new Product(urunVerisi);
        const newProduct = await product.save();
        res.status(201).json(newProduct);
    } catch (err) { res.status(400).json({ message: err.message }); }
});

// 5. ÜRÜN SİL (Sadece Admin)
app.delete('/api/products/:id', adminKontrol, async (req, res) => {
    try { await Product.findByIdAndDelete(req.params.id); res.json({ message: 'Silindi' }); } 
    catch (err) { res.status(500).json({ message: err.message }); }
});

// 6. ÜRÜN GÜNCELLE (Sadece Admin)
app.put('/api/products/:id', adminKontrol, async (req, res) => {
    try {
        let urunVerisi = req.body;
        if(urunVerisi.resim1) urunVerisi.resim1 = await resmiCloudinaryeYukle(urunVerisi.resim1);
        if(urunVerisi.resim2) urunVerisi.resim2 = await resmiCloudinaryeYukle(urunVerisi.resim2);

        if (urunVerisi.renkDetaylari) {
            for (const renk of Object.keys(urunVerisi.renkDetaylari)) {
                const resimDizisi = urunVerisi.renkDetaylari[renk];
                if (Array.isArray(resimDizisi)) {
                    urunVerisi.renkDetaylari[renk] = await Promise.all(
                        resimDizisi.map(async (img) => await resmiCloudinaryeYukle(img))
                    );
                }
            }
        }
        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, urunVerisi, { new: true });
        res.json(updatedProduct);
    } catch (err) { res.status(400).json({ message: err.message }); }
});

// --- KUPON ROTALARI (GÜNCELLENDİ: Admin Koruması Eklendi) ---
app.post('/api/coupons', adminKontrol, async (req, res) => { // <-- KORUMA EKLENDİ
    try {
        const newCoupon = new Coupon(req.body);
        await newCoupon.save();
        res.status(201).json(newCoupon);
    } catch (err) { res.status(400).json({ message: err.message }); }
});

app.get('/api/coupons', async (req, res) => { // Okumak serbest
    try { const coupons = await Coupon.find(); res.json(coupons); } 
    catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete('/api/coupons/:id', adminKontrol, async (req, res) => { // <-- KORUMA EKLENDİ
    try { await Coupon.findByIdAndDelete(req.params.id); res.json({ message: 'Silindi' }); } 
    catch (err) { res.status(500).json({ message: err.message }); }
});

// --- SİPARİŞ ROTALARI (Stok Düşmeli & Güvenli) ---
app.post('/api/orders', async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const { musteriIsim, musteriSoyisim, email, telefon, adres, sehir, urunler } = req.body;
        let dogrulanmisUrunler = [];
        let toplamTutar = 0;

        for (const siparisUrunu of urunler) {
            const dbUrun = await Product.findById(siparisUrunu.urunId).session(session);
            if (!dbUrun) throw new Error(`Ürün bulunamadı (ID: ${siparisUrunu.urunId})`);

            if (siparisUrunu.secilenRenk) {
                const mevcutStok = dbUrun.stokDetaylari ? dbUrun.stokDetaylari[siparisUrunu.secilenRenk] : 0;
                if (!mevcutStok || mevcutStok < siparisUrunu.adet) {
                    throw new Error(`${dbUrun.isim} (${siparisUrunu.secilenRenk}) stokta yok!`);
                }
                const stokYolu = `stokDetaylari.${siparisUrunu.secilenRenk}`;
                await Product.findByIdAndUpdate(dbUrun._id, { 
                    $inc: { [stokYolu]: -siparisUrunu.adet, stok: -siparisUrunu.adet } 
                }).session(session);
            } else {
                if (dbUrun.stok < siparisUrunu.adet) throw new Error(`${dbUrun.isim} stokta yok!`);
                dbUrun.stok -= siparisUrunu.adet;
                await dbUrun.save({ session });
            }

            dogrulanmisUrunler.push({
                urunId: dbUrun._id, isim: dbUrun.isim, adet: siparisUrunu.adet,
                fiyat: dbUrun.fiyat, secilenRenk: siparisUrunu.secilenRenk, resim: siparisUrunu.resim
            });
            toplamTutar += dbUrun.fiyat * siparisUrunu.adet;
        }

        const yeniSiparis = new Order({
            musteriIsim, musteriSoyisim, email, telefon, adres, sehir,
            urunler: dogrulanmisUrunler, toplamTutar: toplamTutar
        });

        await yeniSiparis.save({ session });
        await session.commitTransaction();
        session.endSession();
        res.status(201).json(yeniSiparis);
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ message: err.message });
    }
});

app.get('/api/orders', async (req, res) => {
    try { const o = await Order.find().sort({ tarih: -1 }); res.json(o); } 
    catch (e) { res.status(500).json({ message: e.message }); }
});

// --- ÜYELİK ROTALARI ---

// EKLENEN KISIM: REGISTER ROTASI (Eksikti!)
app.post('/api/register', async (req, res) => {
    try {
        const { isim, soyisim, email, sifre, telefon } = req.body;
        const m = await User.findOne({ email }); if (m) return res.status(400).json({ message: 'Kullanılıyor' });
        const s = await bcrypt.genSalt(10); const h = await bcrypt.hash(sifre, s);
        const n = new User({ isim, soyisim, email, telefon, sifre: h }); await n.save();
        res.status(201).json({ message: 'Kayıt başarılı!' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, sifre } = req.body;
        const u = await User.findOne({ email });
        if (!u) return res.status(400).json({ message: 'Bulunamadı' });

        const m = await bcrypt.compare(sifre, u.sifre);
        if (!m) return res.status(400).json({ message: 'Hatalı şifre' });

        const token = jwt.sign({ id: u._id, isAdmin: u.isAdmin }, JWT_SECRET, { expiresIn: '24h' });

        res.json({ message: 'Başarılı', token: token, user: { id: u._id, isim: u.isim, soyisim: u.soyisim, email: u.email, isAdmin: u.isAdmin } });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/users/:id', async (req, res) => {
    try { const u = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-sifre'); res.json(u); } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/users/:id', async (req, res) => {
    try { const u = await User.findById(req.params.id).select('-sifre'); res.json(u); } catch (e) { res.status(500).json({ message: e.message }); }
});

// --- ADMIN YAPMA (Geçici Rota) ---
app.get('/admin-yap/:email', async (req, res) => {
    try {
        const email = req.params.email;
        const user = await User.findOneAndUpdate({ email: email }, { isAdmin: true }, { new: true });
        if (!user) return res.send("Kullanıcı bulunamadı! Önce siteye üye olmalısın.");
        res.send(`Tebrikler ${user.isim}! Artık ADMIN yetkisine sahipsin. Çıkış yapıp tekrar gir.`);
    } catch (err) { res.send("Hata: " + err.message); }
});

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

const PORT = 5000;
app.listen(PORT, () => { console.log(`Site yayında: http://localhost:${PORT}`); });