# 21 Gram Gastrobar — 3D "Döner Tabla" QR Menü (Demo)

## Bağlam

- **Amaç:** 21 Gram Gastrobar'a sunulacak, etkileyici bir 3D QR menü **demosu**. İşletme sahibi ilk 10 saniyede "vay be" demeli. Yayına alma ve admin panel kapsam dışı.
- **Kaynaklar:**
  - `21gram-menu-3d.html`: Kullanıcının tek dosyalık prototipi, 1.6 MB. İçinde Three.js'te 3D çevrilmiş logo, süzülen krem figürler, eğilen DOM kartlar, tabaklı detay ekranı, 12 örnek ürün (şeffaf webp), marka renkleri ve fontlar var.
  - Mevcut Simpra menüsü (`qr-menu.simprasuite.com/21-gram-gastrobar/...`): Gerçek menü, yaklaşık 60-80 ürün. Fotoğraflar beyaz zeminde. Yiyecek / Alkollü içecek / İçecek grupları var.
  - delice.ca: Kaydırdıkça değişen kategori renkleri, krem tabak halkaları, sıcak ve "elle yapılmış" his.
- **Kullanıcının kararları:**
  - 3D ağır basacak.
  - Fikir: **A) Döner tabla**.
  - Simpra'daki **menünün tamamı** girecek.
  - Kullanım amacı: sunum/demo.

## Hedefler / Hedef olmayanlar / Başarısızlık sayılacaklar

- **Hedef:** Telefonda akıcı (yaklaşık 60 fps hedefi) bir 3D menü. Açılışta 3D logo, ardından her kategori dönen bir tabla, ürünler tabakta, her kategorinin kendi renk dünyası.
- **Hedef:** Ürün bulmak hâlâ kolay olacak. Kategori atlama ve arama 2-3 dokunuşu geçmeyecek.
- **Hedef olmayan:** Admin paneli, sipariş, çoklu dil, Simpra ile canlı senkron.
- **Başarısızlık sayılır:**
  - Telefonda takılan, 5 saniyeden uzun boş ekran gösteren bir açılış.
  - Fiyatı görmek için uğraştıran bir arayüz.
  - Bozuk ya da kenarı beyaz kalmış ürün kesimleri.

## Yaklaşımlar (seçilen: A)

| | Yaklaşım | Neden |
|---|---|---|
| **A ✔** | **Döner tabla:** her kategori bir tabla. Yatay kaydırma tablayı çevirir, dikey kaydırma kat (kategori) değiştirir. | Telefonda doğal, "masa ve tabak" fikrine birebir uyuyor, ürün bulmak kolay kalıyor. |
| B | Kamera yolculuğu: kaydırınca 3D mekânda ilerleme | Sinematik ama mobilde takılgan, bulması yavaş, mekân modeli gerektirir. |
| C | Ürün galaksisi | Menüden çok oyun gibi hissettirir. |

## Tasarım

**Sahne akışı**
1. **Açılış:** Prototipteki 3D logo ve süzülen figürler aynen taşınır. `LOGO_SHAPES`, `FIGS` SVG'leri ve sürükle/jiroskop mantığı prototipte 210-486. satırlar arasında. "Menüyü aç" deyince logo kameraya doğru büyüyerek geçer ve ilk tablaya iner.
2. **Tablalar:** Her kategori dikeyde üst üste dizilmiş katlardan biri.
   - Tabla krem renkli, hafif ahşap ya da seramik görünümlü bir silindir. Kenarında N adet krem tabak durur, yarıçap N'e göre büyür.
   - Ürün, tabağın üstünde şeffaf fotoğraflı bir düzlem olarak durur. Hep kameraya dönük kalır (sınırlı billboard), altında yumuşak bir gölge (contact shadow) olur.
   - **Yatay sürükleme:** Tabla atalet ile döner ve en yakın tabağa oturur (snap). Öndeki ürünün **adı, fiyatı ve kısa açıklaması** DOM katmanında gösterilir.
   - **Dikey sürükleme veya çip:** Kamera bir sonraki kata iner. Sis, ışık ve arka plan rengi o kategorinin rengine akar (Délice etkisi).
3. **Detay:** Tabağa dokununca tabak kalkıp kameraya yaklaşır ve parmakla eğilir/çevrilir (prototipteki tilt mantığı). Önceki/sonraki ile aynı katta gezilir. Her ürünün kendi linki olur (`#ürün-id`), prototipteki gibi.
4. **Navigasyon (DOM):**
   - Üstte logo, grup sekmeleri (Yiyecek / Alkollü / İçecek) ve kategori çipleri.
   - **Arama** tam ekran hafif bir liste olarak açılır. Sonuca dokununca kamera o kata uçar ve tablayı o tabağa çevirir.
   - Aynı liste, WebGL yoksa yedek görünüm olarak kullanılır.

**Görsel dil**
- Prototipteki marka değişkenleri kullanılacak: `--red #E4032D`, `--wine #7B0A1F`, `--cream #FFFCEC`, `--ink #1D0A0E`. Fontlar Unbounded + Schibsted Grotesk; prototipte base64 gömülü, buradan woff2 dosyası olarak çıkarılacak.
- Her kategorinin rengi `menu.json` içinde tanımlanacak. **Benim önerim:** Smash = kırmızı, Tavuk = hardal, Paylaşımlık = turuncu, Sos = domates, Tatlı = kakao, kokteyller = bordo/mor, Bira = amber, sıcak içecek = kahve, soğuk içecek = turkuaz. İşletmeyle ince ayar yapılabilir.

**Teknik (benim kararlarım)**
- **Vite + vanilla JS + Three.js** (npm, modül). Geçişler için GSAP. Statik build.
- **Klasör yapısı:** `index.html`, `src/{main,scene,turntable,intro,detail,ui,search}.js`, `public/menu.json`, `public/img/*.webp`, `public/fonts/`. Orijinal prototip `reference/` altına taşınır.
- **Performans:**
  - Dokular sadece aktif kat ve komşu katlar için yüklenir. Görseller yaklaşık 512px webp.
  - DPR en fazla 2. Detay açıkken arka plan render'ı yavaşlatılır.
  - `prefers-reduced-motion` açıksa otomatik dönme ve figürler kapanır.

## Uygulama adımları

1. **Kurulum:**
   - `git init` yapılır, Vite projesi kurulur, prototip `reference/21gram-menu-3d.html` olarak taşınır.
   - Bu tasarım `docs/superpowers/specs/2026-11-22-21gram-3d-menu-design.md` olarak kaydedilir.
2. **Varlıkları prototipten çıkarma** (Node script, `scripts/extract-prototype.mjs`):
   - Fontlar woff2 olarak.
   - `LOGO_SHAPES` json olarak.
   - `LOGO_IMG` ve `FIGS` SVG'leri.
   - 12 ürün ve şeffaf webp'leri.
3. **Simpra menüsünü çekme** (`scripts/scrape-simpra.mjs`, Playwright):
   - Önce ağ isteklerinde menü JSON API'si aranır. Yoksa her grup sekmesi DOM'dan okunur.
   - Çıktı: grup, kategori, ad, açıklama, fiyat, görsel URL'si → `public/menu.json`.
4. **Görselleri dekupe etme** (`scripts/cutout.mjs`, sharp):
   - Beyaz zemin kenarlardan flood-fill ile toleranslı şekilde silinir, kenar yumuşatılır, sonra kırpılıp webp'ye çevrilir.
   - Prototipte zaten olan 10 şeffaf görsel tercih edilir.
   - Kötü çıkanlar elle listelenir. Gerekirse `rembg` ile yeniden yapılır.
   - Görseli olmayan ürünlere logo rozetli tabak konur (prototipteki `.ph` gibi).
5. **Açılış sahnesi** (`intro.js`): Prototipteki logo ve figürler modüler hale getirilir. Ardından açılıştan menüye geçiş yazılır.
6. **Döner tabla** (`turntable.js`):
   - Tabla geometrisi, tabaklar, billboard ürünler ve gölge.
   - Sürükle-atalet-snap fiziği.
   - Katlar arası kamera geçişi ve renk akışı.
7. **DOM katmanı** (`ui.js`): Sekmeler, çipler, ürün bilgi kartı, erişilebilirlik (aria-live ile aktif ürün okunur, klavyede ←/→ ve ↑/↓).
8. **Detay ve arama** (`detail.js`, `search.js`): Tabak kalkışı, eğme, önceki/sonraki, hash linkleri, arama listesi ve WebGL yoksa yedek görünüm.
9. **Cila:** Jiroskop paralaksı, ses yok, yükleme ekranı (logo ilerleme), reduced-motion, performans ayarı.
10. **(İsteğe bağlı, kullanıcı onayıyla)** Demo için Netlify/Vercel'e yükleme ve sunumda kullanılacak QR kodun üretilmesi.

## Doğrulama

- `npm run dev`, ardından Playwright ile 390×844 (telefon) ve 1440×900 boyutlarında ekran görüntüsü:
  - açılış, ilk tabla, kat geçişi, detay, arama, no-WebGL yedek görünüm.
- Konsolda hata olmamalı.
- `menu.json` içindeki ürün sayısı Simpra'daki sayıyla tutmalı. Her ürünün fiyatı tabla bilgi kartında ve aramada görünmeli.
- Dekupe görseller tek bir kontrol sayfasında (`/cutouts.html`) ızgara halinde gözle kontrol edilmeli.
- `npm run build` ile bundle boyutu ve ilk boyama ölçülmeli. Hedef: ilk ekran 1 MB altı, dokular sonradan yüklenir.
- Gerçek telefonda deneme: aynı ağda `npm run dev -- --host` ile açılıp kaydırma akıcılığı kontrol edilir.
