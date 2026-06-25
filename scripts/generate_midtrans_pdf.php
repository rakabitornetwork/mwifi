<?php

// Bootstrap Laravel
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\File;

try {
    echo "Starting PDF generation process...\n";

    // 1. Define paths
    $artifactPath = 'C:\\Users\\Amon\\.gemini\\antigravity\\brain\\007edfbe-b20d-41d4-a4d5-148788b86a34\\payment_flowchart_1782353899771.png';
    $publicImagesDir = public_path('images');
    $publicDocsDir = public_path('docs');
    $destinationImage = $publicImagesDir . '/payment_flowchart.png';
    $destinationPdf = $publicDocsDir . '/Alur_Transaksi_Midtrans.pdf';

    // 2. Ensure directories exist
    if (!File::exists($publicImagesDir)) {
        File::makeDirectory($publicImagesDir, 0755, true);
        echo "Created directory: {$publicImagesDir}\n";
    }
    if (!File::exists($publicDocsDir)) {
        File::makeDirectory($publicDocsDir, 0755, true);
        echo "Created directory: {$publicDocsDir}\n";
    }

    // 3. Copy flowchart image
    if (File::exists($artifactPath)) {
        File::copy($artifactPath, $destinationImage);
        echo "Copied flowchart image to: {$destinationImage}\n";
    } else {
        echo "WARNING: Source flowchart image not found at {$artifactPath}. Checking alternative path...\n";
        // Fallback check in current folder if it was saved locally
        $localCheck = __DIR__ . '/../payment_flowchart_1782353899771.png';
        if (File::exists($localCheck)) {
            File::copy($localCheck, $destinationImage);
            echo "Copied flowchart image from local fallback to: {$destinationImage}\n";
        } else {
            echo "ERROR: Flowchart image could not be found.\n";
        }
    }

    // 4. Prepare HTML content for PDF
    // We will use standard CSS compatible with Dompdf (Helveitca, tables, clear margins)
    $htmlContent = '
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <title>Dokumen Pendukung Midtrans - Alur Transaksi mWiFi</title>
        <style>
            @page {
                margin: 1.5cm 1.5cm 2cm 1.5cm;
            }
            body {
                font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
                color: #334155;
                font-size: 11pt;
                line-height: 1.6;
            }
            .header-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 25px;
                border-bottom: 3px solid #10b981;
                padding-bottom: 15px;
            }
            .header-title {
                font-size: 18pt;
                font-weight: bold;
                color: #1e293b;
                margin: 0;
            }
            .header-subtitle {
                font-size: 10.5pt;
                color: #64748b;
                margin-top: 5px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .company-info {
                text-align: right;
                font-size: 9pt;
                color: #475569;
            }
            h1 {
                font-size: 14pt;
                color: #1e293b;
                border-left: 4px solid #10b981;
                padding-left: 10px;
                margin-top: 25px;
                margin-bottom: 12px;
            }
            h2 {
                font-size: 12pt;
                color: #0f172a;
                margin-top: 20px;
                margin-bottom: 8px;
            }
            p {
                margin-top: 0;
                margin-bottom: 12px;
                text-align: justify;
            }
            .alert-box {
                background-color: #f0fdf4;
                border: 1px solid #bbf7d0;
                border-left: 4px solid #10b981;
                padding: 12px 15px;
                margin-bottom: 20px;
                border-radius: 4px;
            }
            .alert-title {
                font-weight: bold;
                color: #065f46;
                margin-bottom: 5px;
            }
            .alert-content {
                color: #047857;
                font-size: 10pt;
                margin: 0;
            }
            .flowchart-container {
                text-align: center;
                margin: 25px 0;
                padding: 10px;
                border: 1px solid #e2e8f0;
                background-color: #f8fafc;
                border-radius: 6px;
                page-break-inside: avoid;
            }
            .flowchart-img {
                width: 100%;
                max-width: 580px;
                height: auto;
            }
            .flowchart-caption {
                font-size: 9pt;
                color: #64748b;
                margin-top: 8px;
                font-style: italic;
            }
            .timeline-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 15px;
            }
            .timeline-table th {
                background-color: #1e293b;
                color: #ffffff;
                text-align: left;
                padding: 10px;
                font-size: 10pt;
                font-weight: bold;
            }
            .timeline-table td {
                padding: 12px 10px;
                border-bottom: 1px solid #e2e8f0;
                font-size: 9.5pt;
                vertical-align: top;
            }
            .step-badge {
                display: inline-block;
                background-color: #10b981;
                color: #ffffff;
                font-weight: bold;
                padding: 2px 8px;
                border-radius: 10px;
                font-size: 8.5pt;
                text-align: center;
            }
            .page-break {
                page-break-before: always;
            }
            .footer-info {
                position: fixed;
                bottom: -1cm;
                left: 0;
                right: 0;
                height: 30px;
                text-align: center;
                font-size: 8pt;
                color: #94a3b8;
                border-top: 1px solid #f1f5f9;
                padding-top: 5px;
            }
        </style>
    </head>
    <body>
        
        <!-- Header -->
        <table class="header-table">
            <tr>
                <td>
                    <div class="header-title">Dokumen Pendukung Onboarding Midtrans</div>
                    <div class="header-subtitle">Penjelasan Model Bisnis & Alur Transaksi Pelanggan (Customer Journey)</div>
                </td>
                <td class="company-info">
                    <strong>mWiFi Billing System</strong><br>
                    Platform Manajemen RT/RW Net & ISP<br>
                    Website: <span style="color: #10b981;">https://mwifi.test</span>
                </td>
            </tr>
        </table>

        <!-- Footer -->
        <div class="footer-info">
            Dokumen Alur Pembayaran mWiFi - Dibuat untuk Kelengkapan Data Susulan Merchant Midtrans
        </div>

        <!-- Section 1 -->
        <h1>1. Penjelasan Klasifikasi Model Bisnis Layanan</h1>
        
        <div class="alert-box">
            <div class="alert-title">Catatan Midtrans #1:</div>
            <p class="alert-content">Apakah hanya untuk jasa pemasangan atau menyediakan paket berlangganan internet?</p>
        </div>

        <p>
            Dengan ini kami konfirmasikan bahwa layanan utama yang disediakan melalui sistem mWiFi adalah 
            <strong>Penyediaan Paket Berlangganan Akses Internet Bulanan (Subscription Internet Service)</strong> 
            yang dikelola oleh ISP (Internet Service Provider) lokal atau operator RT/RW Net.
        </p>
        <p>
            Sistem pembayaran yang diintegrasikan dengan Midtrans digunakan secara khusus untuk memproses 
            <strong>tagihan berlangganan rutin bulanan (recurring/monthly subscription fee)</strong> dari pelanggan aktif. 
            Nominal tagihan disesuaikan dengan paket kecepatan bandwidth yang disewa oleh pelanggan (misalnya Paket Home-10Mbps, Paket Business-20Mbps, dll.).
        </p>
        <p>
            Layanan ini <strong>BUKAN</strong> merupakan jasa pemasangan satu kali (one-time installation/construction service). 
            Biaya pemasangan/instalasi fisik perangkat (ONT/Router) di awal biasanya ditangani secara langsung atau terpisah di luar sistem tagihan online bulanan ini. 
            Oleh karena itu, transaksi pelanggan di portal ini akan terjadi secara berkala setiap bulannya selama pelanggan berlangganan internet aktif.
        </p>

        <!-- Section 2 -->
        <h1>2. Diagram Alur Transaksi / Payment Flow</h1>
        <p>
            Berikut adalah representasi visual dari alur perjalanan pelanggan (Customer Journey) dimulai dari penerimaan informasi tagihan, login portal, checkout pembayaran, hingga aktivasi otomatis layanan internet pada perangkat router:
        </p>

        <div class="flowchart-container">
            <img class="flowchart-img" src="' . $destinationImage . '" alt="Flowchart Alur Transaksi" />
            <div class="flowchart-caption">Gambar 1.0: Flowchart Integrasi Sistem mWiFi dengan Midtrans Snap API</div>
        </div>

        <div class="page-break"></div>

        <!-- Header Page 2 -->
        <table class="header-table">
            <tr>
                <td>
                    <div class="header-title">Dokumen Pendukung Onboarding Midtrans</div>
                    <div class="header-subtitle">Penjelasan Model Bisnis & Alur Transaksi Pelanggan (Customer Journey)</div>
                </td>
                <td class="company-info">
                    <strong>mWiFi Billing System</strong><br>
                    Halaman 2
                </td>
            </tr>
        </table>

        <!-- Section 3 -->
        <h1>3. Detail Alur Perjalanan Pelanggan (Customer Journey)</h1>
        <p>
            Berikut adalah rincian langkah demi langkah dari sisi pelanggan (frontend) serta respon teknis sistem di latar belakang (backend) saat melakukan transaksi:
        </p>

        <table class="timeline-table">
            <thead>
                <tr>
                    <th style="width: 80px;">Langkah</th>
                    <th style="width: 200px;">Aktivitas Pelanggan (Frontend)</th>
                    <th>Proses Sistem & Gateway (Backend)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="text-align: center;"><span class="step-badge">Tahap 1</span></td>
                    <td><strong>Menerima Link Tagihan</strong><br><span style="font-size: 8.5pt; color: #64748b;">Menerima pesan WhatsApp</span></td>
                    <td>Setiap bulan, scheduler mWiFi men-generate invoice tagihan (H-5 sebelum jatuh tempo). Sistem mengirim pesan notifikasi WhatsApp berisi rincian tagihan beserta link URL portal pelanggan.</td>
                </tr>
                <tr>
                    <td style="text-align: center;"><span class="step-badge">Tahap 2</span></td>
                    <td><strong>Login Portal dengan OTP</strong><br><span style="font-size: 8.5pt; color: #64748b;">Akses via HP / Browser</span></td>
                    <td>Pelanggan membuka portal, memasukkan nomor WhatsApp terdaftar, dan meminta kode OTP. Sistem mengirimkan kode OTP secara real-time untuk login aman tanpa password.</td>
                </tr>
                <tr>
                    <td style="text-align: center;"><span class="step-badge">Tahap 3</span></td>
                    <td><strong>Melihat Tagihan Aktif</strong><br><span style="font-size: 8.5pt; color: #64748b;">Dashboard Pelanggan</span></td>
                    <td>Setelah berhasil login, dashboard menampilkan profil, paket aktif, dan tabel "Tagihan Berjalan". Pelanggan dapat meninjau rincian invoice (Nomor invoice, periode, nominal).</td>
                </tr>
                <tr>
                    <td style="text-align: center;"><span class="step-badge">Tahap 4</span></td>
                    <td><strong>Klik Tombol Bayar</strong><br><span style="font-size: 8.5pt; color: #64748b;">Checkout Pembayaran</span></td>
                    <td>Pelanggan mengklik tombol <strong>"Bayar"</strong> pada tagihan. Sistem memanggil API Midtrans Snap secara <em>server-to-server</em> untuk membuat token transaksi unik untuk invoice tersebut.</td>
                </tr>
                <tr>
                    <td style="text-align: center;"><span class="step-badge">Tahap 5</span></td>
                    <td><strong>Pilih Metode & Selesaikan</strong><br><span style="font-size: 8.5pt; color: #64748b;">Halaman Midtrans Snap</span></td>
                    <td>Halaman memunculkan widget pop-up / mengalihkan ke halaman Midtrans Snap. Pelanggan memilih metode pembayaran (QRIS, E-Wallet, VA Bank, dll.) dan menyelesaikannya.</td>
                </tr>
                <tr>
                    <td style="text-align: center;"><span class="step-badge">Tahap 6</span></td>
                    <td><strong>Aktivasi Layanan Instan</strong><br><span style="font-size: 8.5pt; color: #64748b;">Internet Aktif Kembali</span></td>
                    <td>Midtrans mengirimkan callback Webhook ke API mWiFi. Sistem memverifikasi data, menandai invoice <strong>"Lunas (Paid)"</strong>, mengirimkan pesan lunas ke WhatsApp, dan secara otomatis mengubah status/profil PPPoE di MikroTik router dari status isolir ke aktif kembali secara real-time.</td>
                </tr>
            </tbody>
        </table>

        <h2 style="margin-top: 25px;">Kesimpulan Integrasi</h2>
        <p>
            Dengan alur di atas, Midtrans Snap bertindak sebagai gerbang pembayaran yang aman dan handal bagi pelanggan. Integrasi API Webhook Midtrans memastikan transaksi tercatat secara instan, meminimalisir intervensi manual admin, dan memberikan kenyamanan bagi pelanggan yang layanan internetnya dapat langsung aktif kembali dalam hitungan detik setelah pembayaran sukses dikonfirmasi.
        </p>

    </body>
    </html>
    ';

    // 5. Render HTML to PDF
    echo "Rendering PDF using Dompdf...\n";
    $pdf = Pdf::loadHTML($htmlContent);
    $pdf->setPaper('A4', 'portrait');
    
    // Save to destination
    $pdf->save($destinationPdf);

    echo "SUCCESS: PDF successfully generated and saved at: {$destinationPdf}\n";
} catch (Exception $e) {
    echo "ERROR failed to generate PDF: " . $e->getMessage() . "\n";
    echo "Trace: \n" . $e->getTraceAsString() . "\n";
}
