/* --- layout.js (BACKEND ENTEGRASYONLU & GÜNCEL) --- */

// API Adresi
const API_BASE_URL = "/api";

// Global Veri Havuzu (Arama ve Menüler için)
let siteUrunleri = [];
let siteKategorileri = [];

// 1. HEADER
const siteHeader = `
    <div class="sirket-ismi">
        <a href="index.html">AYBARS</a>
        <p>MINIMALIST WOODEN FURNISHING</p>
    </div>
    <div class="sag-menu">
        <div class="search-btn" onclick="toggleSearch()"><i class="fas fa-search"></i></div>
        <div class="favoriler-link" style="margin-right: 20px; cursor: pointer; font-size: 18px;">
            <a href="favorites.html" title="Favorilerim"><i class="far fa-heart"></i></a>
        </div>
        <div class="sepet"><a href="cart.html">Sepetim (0)</a></div>
        <div class="login-register"></div>
    </div>
`;

// 2. FOOTER
const siteFooter = `
    <div class="footer-container">
        <div class="footer-column">
            <h3>Menü</h3>
            <ul>
                <li><a href="index.html">Ana Sayfa</a></li>
                <li><a href="index.html?kategori=hepsi">Tüm Ürünler</a></li>
                <li><a href="about.html">Hakkımızda</a></li>
                <li><a href="contact.html">İletişim</a></li>
                <li><a href="faq.html">Sıkça Sorulan Sorular</a></li> 
            </ul>
        </div>
        <div class="footer-column">
            <h3>Koleksiyonlar</h3>
            <ul id="footer-cat-list"><li><small>Yükleniyor...</small></li></ul>
        </div>
        <div class="footer-column">
            <h3>Politikalar</h3>
            <ul>
                <li><a href="refund.html">İade Koşulları</a></li>
                <li><a href="privacy.html">Gizlilik Politikası</a></li>
            </ul>
        </div>
    </div>
    <div class="footer-bottom"><p>© 2024 AYBARS STORE.</p></div>
`;

// 3. MOBİL ALT MENÜ
const mobileBottomNav = `
    <div class="mobile-bottom-nav">
        <a href="index.html" class="nav-item-mobile"><i class="fas fa-home"></i><span>Anasayfa</span></a>
        <a href="#" onclick="toggleSearch(); return false;" class="nav-item-mobile"><i class="fas fa-search"></i><span>Ara</span></a>
        <a href="favorites.html" class="nav-item-mobile"><i class="far fa-heart"></i><span>Favoriler</span></a>
        <a href="cart.html" class="nav-item-mobile mobile-cart-badge"><i class="fas fa-shopping-bag"></i><div id="mob-cart-count" class="mobile-badge-count">0</div><span>Sepet</span></a>
        <a href="login.html" class="nav-item-mobile" id="mob-profile-link"><i class="far fa-user"></i><span>Profil</span></a>
    </div>
`;

// 4. ARAMA OVERLAY
const searchOverlayHTML = `
    <div id="searchOverlay" class="search-overlay">
        <button class="close-search" onclick="toggleSearch()">&times;</button>
        <div class="search-box-wrapper" onclick="event.stopPropagation()">
            <input type="text" id="searchInput" class="search-input" placeholder="Ürün Ara..." oninput="urunAra()">
            <div id="searchResults" class="search-results"></div>
        </div>
    </div>
`;

// 5. WHATSAPP BUTONU
const whatsappNumber = "905539430026"; 
const whatsappMessage = "Merhaba, ürünleriniz hakkında bilgi almak istiyorum.";
const whatsappHTML = `<a href="https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}" class="whatsapp-btn" target="_blank"><i class="fab fa-whatsapp"></i></a>`;
const whatsappStyles = `<style>.whatsapp-btn { position: fixed; bottom: 30px; right: 30px; width: 60px; height: 60px; background-color: #25d366; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); z-index: 9999; transition: all 0.3s ease; text-decoration: none; animation: pulse 2s infinite; } .whatsapp-btn:hover { transform: scale(1.1); background-color: #128c7e; } .whatsapp-btn i { margin-top: 2px; } @media (max-width: 768px) { .whatsapp-btn { bottom: 85px; right: 20px; width: 50px; height: 50px; font-size: 26px; } } @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.7); } 70% { box-shadow: 0 0 0 15px rgba(37, 211, 102, 0); } 100% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0); } }</style>`;

document.addEventListener("DOMContentLoaded", async function() {
    document.head.insertAdjacentHTML("beforeend", whatsappStyles);

    const headerElement = document.querySelector('header');
    const footerElement = document.querySelector('footer');
    
    if(headerElement) headerElement.innerHTML = siteHeader;
    if(footerElement) footerElement.innerHTML = siteFooter;
    
    document.body.insertAdjacentHTML('beforeend', mobileBottomNav);
    
    if (!document.getElementById('searchOverlay')) {
        document.body.insertAdjacentHTML('beforeend', searchOverlayHTML);
    }

    document.body.insertAdjacentHTML('beforeend', whatsappHTML);
    
    // --- KRİTİK: Verileri Backend'den Çek ---
    await verileriHazirla();

    // Veriler geldikten sonra arayüzü doldur
    if(typeof sepetSayisiniGuncelle === 'function') sepetSayisiniGuncelle(); 
    if(typeof girisKontroluYap === 'function') girisKontroluYap();
    mobilMenuKategorileriDoldur();
    footerKategorileriDoldur();
    
    const overlay = document.getElementById('searchOverlay');
    const input = document.getElementById('searchInput');
    if (overlay && input) {
        overlay.addEventListener('click', function(e) {
            if (e.target !== document.querySelector('.close-search') && !e.target.closest('.search-results')) {
                input.focus(); 
            }
        });
    }
});

// --- YENİ: VERİ ÇEKME FONKSİYONU ---
async function verileriHazirla() {
    try {
        // Ürünleri API'den çek
        const response = await fetch(`${API_BASE_URL}/products`);
        if(response.ok) {
            siteUrunleri = await response.json();
            
            // Kategorileri ürünlerden otomatik türet (Unique list)
            // Eğer ürünlerin 'kategori' alanı varsa onları topluyoruz
            const hamKategoriler = siteUrunleri.map(u => u.kategori).filter(k => k); // Boş olmayanları al
            const uniqueKategoriler = [...new Set(hamKategoriler)]; // Tekrar edenleri sil
            
            // Kategori objelerini oluştur
            siteKategorileri = uniqueKategoriler.map(k => ({
                id: k,
                ad: k.charAt(0).toUpperCase() + k.slice(1) // Baş harfi büyüt
            }));
        }
    } catch (error) {
        console.error("Layout veri çekme hatası:", error);
        // Hata olursa boş kalır, site çökmez
    }
}

// --- ARAMA FONKSİYONLARI (Backend Verisi Kullanır) ---
function toggleSearch(){
    const o = document.getElementById('searchOverlay');
    const i = document.getElementById('searchInput');
    const r = document.getElementById('searchResults');
    
    if(o.style.display === 'flex'){ 
        o.style.opacity = '0'; 
        setTimeout(() => { o.style.display = 'none'; }, 300);
    } else { 
        o.style.display = 'flex'; 
        setTimeout(() => { 
            o.style.opacity = '1';
            i.focus(); 
        }, 10); 
    }
    i.value = ''; 
    if(r) { r.innerHTML = ''; r.classList.remove('aktif'); }
}

function urunAra(){
    const input = document.getElementById('searchInput');
    const resultsContainer = document.getElementById('searchResults');
    if(!input || !resultsContainer) return;
    
    const inputVal = input.value.toLowerCase().trim();
    
    // Artık localStorage yerine global siteUrunleri dizisini kullanıyoruz
    resultsContainer.innerHTML = ''; 
    resultsContainer.classList.remove('aktif');
    
    if(inputVal.length < 2) return;
    
    const eslesenler = siteUrunleri.filter(x => x.isim && x.isim.toLowerCase().includes(inputVal));
    resultsContainer.classList.add('aktif');
    
    if(eslesenler.length === 0) { 
        resultsContainer.innerHTML = `<div class="search-no-result">Sonuç bulunamadı.</div>`; 
    } else {
        eslesenler.forEach(urun => {
            const katAdi = urun.kategori ? (urun.kategori.charAt(0).toUpperCase() + urun.kategori.slice(1)) : 'Genel';
            // Backend ID'si _id olabilir, onu kontrol ediyoruz
            const id = urun._id || urun.id;
            const resim = urun.resim1 || 'https://via.placeholder.com/50';
            
            resultsContainer.innerHTML += `
                <a href="product.html?id=${id}" class="search-item">
                    <img src="${resim}">
                    <div class="search-info">
                        <h4>${urun.isim}</h4>
                        <div class="search-meta">
                            <span class="search-cat-badge">${katAdi}</span>
                            <span class="search-price">₺${urun.fiyat}</span>
                        </div>
                    </div>
                </a>`;
        });
    }
}

// --- KATEGORİ FONKSİYONLARI (Otomatik) ---
function footerKategorileriDoldur() {
    const ul = document.getElementById('footer-cat-list');
    if(!ul) return;
    ul.innerHTML = ''; 
    
    if (siteKategorileri.length === 0) { 
        // Veri henüz gelmediyse veya yoksa varsayılanları göster
        const defaultCats = [{id:'masa', ad:'Masa'}, {id:'sandalye', ad:'Sandalye'}];
        defaultCats.forEach(kat => { ul.innerHTML += `<li><a href="index.html?kategori=${kat.id}">${kat.ad}</a></li>`; });
    } else { 
        siteKategorileri.slice(0, 6).forEach(kat => { ul.innerHTML += `<li><a href="index.html?kategori=${kat.id}">${kat.ad}</a></li>`; }); 
    }
}

function mobilMenuKategorileriDoldur(){ 
    const u=document.getElementById('mobile-cat-list'); 
    if(u){ 
        u.innerHTML=''; 
        if(siteKategorileri.length > 0) {
            siteKategorileri.forEach(c=>{u.innerHTML+=`<li><a href="index.html?kategori=${c.id}">${c.ad}</a></li>`});
        } else {
            // Yedek
            u.innerHTML += `<li><a href="index.html?kategori=masa">Masa</a></li><li><a href="index.html?kategori=sandalye">Sandalye</a></li>`;
        }
    } 
}

function sepetSayisiniGuncelle(animasyonYap = false) {
    const s = JSON.parse(localStorage.getItem('aybarsSepet')) || [];
    const t = s.reduce((a, b) => a + b.adet, 0);
    const sepetLink = document.querySelector('.sepet a'); 
    if (sepetLink) { sepetLink.innerText = `Sepetim (${t})`; if (animasyonYap) { const sepetDiv = document.querySelector('.sepet'); sepetDiv.classList.remove('sepet-animasyon'); void sepetDiv.offsetWidth; sepetDiv.classList.add('sepet-animasyon'); } }
    const mobCount = document.getElementById('mob-cart-count');
    if(mobCount) { mobCount.innerText = t; mobCount.style.display = t === 0 ? 'none' : 'flex'; }
}

function bildirimGoster(mesaj, tur = 'success') {
    const eskiToast = document.querySelector('.custom-toast'); if(eskiToast) eskiToast.remove();
    const toast = document.createElement('div'); toast.className = 'custom-toast';
    toast.innerHTML = `<span>${mesaj}</span>`;
    if(tur === 'error') toast.style.borderLeft = '4px solid #e74c3c';
    document.body.appendChild(toast);
    setTimeout(() => { toast.classList.add('show'); }, 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => { toast.remove(); }, 300); }, 3000);
}

function toggleMobileMenu(){ 
    const overlay = document.getElementById('mobileOverlay');
    const nav = document.getElementById('mobileNav');
    if(overlay && nav) {
        overlay.classList.toggle('active'); 
        nav.classList.toggle('active'); 
    }
}

function girisKontroluYap(){
    const d=document.querySelector('.login-register'); const l=localStorage.getItem('isLoggedIn'); const u=JSON.parse(localStorage.getItem('aybarsUser'));
    const currentPath = window.location.pathname; const isProfilePage = currentPath.includes('profile.html'); const isOrdersPage = currentPath.includes('orders.html');
    const disabledStyle = 'style="pointer-events: none; opacity: 0.6; background-color: #f9f9f9;"';
    if(d){ 
        if(l==='true'&&u) { d.innerHTML=`<div class="user-menu"><span class="user-name">${u.isim} ${u.soyisim}</span> <i class="fas fa-caret-down"></i><div class="user-dropdown"><a href="profile.html" ${isProfilePage ? disabledStyle : ''}><i class="fas fa-user-cog"></i> Hesap Ayarları</a><a href="orders.html" ${isOrdersPage ? disabledStyle : ''}><i class="fas fa-box"></i> Siparişlerim</a><a href="#" onclick="cikisYap()"><i class="fas fa-sign-out-alt"></i> Çıkış Yap</a></div></div>`; } 
        else { d.innerHTML=`<a href="login.html">Giriş Yap</a> / <a href="login.html">Kayıt Ol</a>`; }
    }
    const mobProfile = document.getElementById('mob-profile-link');
    if(mobProfile) {
        if(l==='true') { mobProfile.href = "profile.html"; mobProfile.querySelector('span').innerText = "Hesabım"; if(isProfilePage) mobProfile.classList.add('active'); } 
        else { mobProfile.href = "login.html"; mobProfile.querySelector('span').innerText = "Giriş"; }
    }
}

function cikisYap(){ 
    localStorage.removeItem('isLoggedIn'); 
    localStorage.removeItem('aybarsUser'); // Kullanıcı bilgisini sil
    localStorage.removeItem('authToken');  // YENİ: Token'ı sil
    
    window.location.href = "index.html"; 
}

function favoriYonet(id, btn) {
    if(event) { event.preventDefault(); event.stopPropagation(); }
    const urunId = id; 
    if (!urunId) return;
    let favs = JSON.parse(localStorage.getItem('aybarsFavoriler')) || [];
    const index = favs.findIndex(f => f == urunId);
    if (index > -1) { favs.splice(index, 1); if(btn) btn.classList.remove('active'); bildirimGoster("Favorilerden çıkarıldı.", "error"); } 
    else { favs.push(urunId); favs = [...new Set(favs)]; if(btn) btn.classList.add('active'); bildirimGoster("Favorilere eklendi!"); }
    localStorage.setItem('aybarsFavoriler', JSON.stringify(favs));
    if (typeof renderFavorites === 'function') renderFavorites();
    else if (typeof favorileriListele === 'function') favorileriListele();
}

function favKontrol(id) { 
    const urunId = id; 
    let favs = JSON.parse(localStorage.getItem('aybarsFavoriler')) || []; 
    return favs.some(f => f == urunId) ? 'active' : ''; 
}