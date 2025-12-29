const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    musteriIsim: { type: String, required: true },
    musteriSoyisim: { type: String, required: true },
    email: { type: String, required: true },
    telefon: { type: String, required: true },
    adres: { type: String, required: true },
    sehir: { type: String, required: true },
    
    // Sepetteki ürünlerin listesi
    urunler: [
        {
            urunId: { type: String }, // MongoDB _id'si
            isim: { type: String },
            adet: { type: Number },
            fiyat: { type: Number },
            secilenRenk: { type: String }, // <-- BURAYA VİRGÜL EKLENDİ
            resim: { type: String }        // <-- YENİ EKLENEN SATIR
        }
    ],
    
    toplamTutar: { type: Number, required: true },
    siparisNotu: { type: String },
    durum: { type: String, default: 'Bekliyor' },
    tarih: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);