# Form pendaftaran calon client

Halaman publik ada di `https://app.damargaleri.com/daftar`. Website utama bisa memberi tombol menuju URL itu dan menambahkan parameter `utm_source`, `utm_medium`, dan `utm_campaign`. Semua pendaftaran menjadi lead baru dengan sumber `website`, tanpa akun client dan tanpa membuat project otomatis. Superadmin dapat mengatur pertanyaan pada menu **Form pendaftaran**.

Lead baru belum ditugaskan kepada PM. Superadmin melihatnya di **Calon client → Detail & follow-up → Ditangani oleh**, kemudian memilih PM yang bertanggung jawab. Setelah itu lead terlihat di akun PM tersebut.

Pertanyaan acara menerima tanggal pasti, perkiraan bulan–tahun, atau belum diketahui. Perkiraan bulan disimpan terpisah dan tidak membuat tanggal palsu di kalender. Saat **Jadikan project**, tim mengonfirmasi nama kedua calon pengantin, tanggal/perkiraan bulan, kota, venue, paket, budget, dan PM. Checklist langsung dibuat; tanggal target dari template tetap kosong sampai tanggal pasti ditetapkan. Ketika tanggal pasti kemudian disimpan, tenggat otomatis yang belum pernah diubah akan dijadwalkan; tenggat yang sudah diedit manual tetap dipertahankan. Akun client tidak dibuat oleh konversi: gunakan undangan dari daftar project setelah email client dikonfirmasi.

## Sebelum mengaktifkan halaman

1. Jalankan migrasi `supabase/20260924_public_lead_form.sql` di project Supabase yang digunakan aplikasi. Pastikan tabel `lead_form_settings` terbaca anonim, sementara tabel `leads` tetap tidak dapat dibaca/ditulis anonim.
2. Buat widget Cloudflare Turnstile untuk hostname `app.damargaleri.com`. Simpan **site key** sebagai variabel build Cloudflare Pages `VITE_TURNSTILE_SITE_KEY` (kunci ini memang publik).
3. Simpan **secret key** sebagai Edge Function secret di Supabase dengan nama `TURNSTILE_SECRET_KEY`. Jangan menyimpan secret tersebut di repo atau di variabel `VITE_*`.
4. Deploy Edge Function `submit-lead` dengan JWT verification **disabled** sesuai `supabase/config.toml`. Function ini hanya menerima origin aplikasi, memeriksa token Turnstile beserta hostname, lalu menulis ke tabel lead memakai service role di server. `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` disediakan oleh lingkungan Edge Functions.
5. Deploy frontend setelah variabel build tersedia. Coba kirim satu lead uji yang sah dan pastikan data tampil di menu **Calon client** dengan sumber `website`, UTM, dan jawaban tambahan. Uji juga permintaan tanpa captcha dan query anonim ke tabel `leads`; keduanya harus ditolak.

Jika website utama kelak menampilkan formulir langsung dari `damargaleri.com` tanpa pindah halaman, origin dan hostname perlu ditambahkan secara eksplisit ke Edge Function dan widget Turnstile. Jangan membuka izin baca atau tulis anonim pada tabel `leads`.
