const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    isim: { type: String, required: true },
    soyisim: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    sifre: { type: String, required: true },
    telefon: { type: String },
    adres: { type: String },
    isAdmin: { type: Boolean, default: false }, // Varsayılan olarak herkes normal üyedir
    kayitTarihi: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
