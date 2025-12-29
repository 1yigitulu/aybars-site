const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    isim: { type: String, required: true },
    fiyat: { type: Number, required: true },
    kategori: { type: String, required: true },
    aciklama: { type: String },
    resim1: { type: String }, // Resim URL'si veya Base64 string
    resim2: { type: String },
    stok: { type: Number, default: 0 },
    // Renk ve varyasyonlar için:
    stokDetaylari: { type: Object, default: {} }, 
    renkDetaylari: { type: Object, default: {} },
    tarih: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', ProductSchema);