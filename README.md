# YOLO FastAPI + Electron

Aplikasi desktop untuk melakukan object detection menggunakan model YOLO. Project ini memakai FastAPI sebagai backend inference dan Electron sebagai frontend desktop.

Fitur utama:

- Detect object dari file gambar.
- Live inference dari kamera atau virtual camera seperti OBS Virtual Camera.
- Visualisasi bounding box, label class, confidence score, dan jumlah objek terdeteksi.
- API HTTP untuk prediksi gambar dan WebSocket untuk inference realtime.

## Tech Stack

- Electron untuk aplikasi desktop.
- FastAPI untuk backend API.
- Ultralytics YOLO untuk inference model.
- OpenCV dan NumPy untuk decoding dan preprocessing gambar.

## Prerequisites

Pastikan software berikut sudah terinstall:

- Node.js 18 atau lebih baru.
- npm, biasanya sudah ikut terinstall bersama Node.js.
- Python 3.10 atau lebih baru.
- pip.
- Git, opsional tetapi disarankan.
- Kamera atau video source jika ingin memakai fitur live detection.

Untuk mengecek versi:

```bash
node --version
npm --version
python --version
pip --version
```

## Struktur Project

```text
.
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── models/
│       └── best.pt
├── index.html
├── main.js
├── preload.js
├── renderer.js
├── styles.css
├── package.json
├── package-lock.json
└── README.md
```

File model yang digunakan backend berada di:

```text
backend/models/best.pt
```

Jika file model tidak ada, backend akan gagal start dengan pesan `Model tidak ditemukan`.

## Instalasi

### 1. Clone atau buka folder project

Jika memakai Git:

```bash
git clone <url-repository>
cd <nama-folder-project>
```

Jika project sudah ada di komputer, langsung buka folder project ini lewat terminal.

### 2. Siapkan model YOLO

Letakkan file model YOLO dengan nama `best.pt` di folder berikut:

```text
backend/models/best.pt
```

Catatan: file model `.pt` biasanya berukuran besar dan tidak ikut disimpan ke Git karena sudah di-ignore oleh `.gitignore`.

### 3. Install dependency backend

Masuk ke folder backend:

```bash
cd backend
```

Buat virtual environment:

```bash
python -m venv .venv
```

Aktifkan virtual environment di Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Jika memakai Command Prompt:

```bat
.venv\Scripts\activate.bat
```

Jika memakai macOS atau Linux:

```bash
source .venv/bin/activate
```

Install dependency Python:

```bash
pip install -r requirements.txt
```

Kembali ke root project:

```bash
cd ..
```

### 4. Install dependency frontend

Di root project, jalankan:

```bash
npm install
```

## Menjalankan Aplikasi

Aplikasi membutuhkan 2 proses yang berjalan bersamaan: backend FastAPI dan frontend Electron.

### 1. Jalankan backend

Buka terminal pertama, masuk ke folder backend, aktifkan virtual environment, lalu jalankan server:

```bash
cd backend
```

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Jalankan FastAPI:

```bash
fastapi dev main.py --host 127.0.0.1 --port 8000
```

Backend akan berjalan di:

```text
http://127.0.0.1:8000
```

### 2. Jalankan frontend

Buka terminal kedua di root project, lalu jalankan:

```bash
npm start
```

Electron akan membuka aplikasi desktop.

## Cara Pakai

### Detect by Photo

1. Pastikan backend FastAPI sudah berjalan.
2. Buka aplikasi Electron dengan `npm start`.
3. Pilih tab `Detect by Photo`.
4. Upload file gambar.
5. Klik tombol detect.
6. Hasil deteksi akan ditampilkan dalam bentuk bounding box dan daftar objek.

### Live Detection

1. Pastikan backend FastAPI sudah berjalan.
2. Buka aplikasi Electron dengan `npm start`.
3. Pilih tab live detection.
4. Pilih camera source dari dropdown.
5. Klik `Start` untuk memulai inference realtime.
6. Klik `Stop` untuk menghentikan streaming.

Jika memakai OBS Virtual Camera, aktifkan virtual camera dari OBS terlebih dahulu, lalu klik refresh pada daftar kamera di aplikasi.

## API Backend

### Health Check

```http
GET /health
```

Response contoh:

```json
{
  "status": "ok"
}
```

### Predict Image

```http
POST /predict
```

Body menggunakan `multipart/form-data` dengan field:

- `file`: file gambar.

Contoh response:

```json
{
  "filename": "image.jpg",
  "image": {
    "width": 1280,
    "height": 720
  },
  "detections": [
    {
      "class_id": 0,
      "class_name": "object",
      "confidence": 0.92,
      "box": {
        "x1": 100.0,
        "y1": 80.0,
        "x2": 300.0,
        "y2": 260.0
      }
    }
  ]
}
```

### WebSocket Inference

```text
ws://127.0.0.1:8000/ws/inference
```

Client mengirim frame gambar sebagai bytes. Server mengembalikan JSON berisi ukuran gambar dan daftar deteksi.

## Konfigurasi URL Backend

Frontend menggunakan backend default:

```text
http://127.0.0.1:8000
ws://127.0.0.1:8000/ws/inference
```

Konfigurasi ini berada di `preload.js` dan dipakai oleh `renderer.js`.

## Troubleshooting

### Backend error: Model tidak ditemukan

Pastikan file model tersedia di:

```text
backend/models/best.pt
```

### Perintah `fastapi` tidak ditemukan

Pastikan virtual environment sudah aktif dan dependency sudah terinstall:

```bash
pip install -r requirements.txt
```

Alternatif menjalankan backend:

```bash
python -m fastapi dev main.py --host 127.0.0.1 --port 8000
```

### Frontend tidak bisa connect ke backend

Pastikan backend berjalan di port `8000` dan bisa diakses melalui:

```text
http://127.0.0.1:8000/health
```

### Kamera tidak muncul

Pastikan browser/Electron mendapat izin kamera. Jika memakai OBS Virtual Camera, aktifkan virtual camera dari OBS terlebih dahulu lalu refresh daftar kamera.

### Install Python dependency gagal pada OpenCV atau Ultralytics

Pastikan Python dan pip versi terbaru, lalu coba update pip:

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## Catatan Git

Folder dan file berikut tidak disimpan ke Git:

- `node_modules/`
- `.venv/`
- `__pycache__/`
- file model seperti `*.pt`
- output build seperti `dist/`, `build/`, dan `out/`

Jika model perlu dibagikan ke anggota tim, simpan di layanan terpisah seperti Google Drive, Hugging Face, atau release artifact, lalu dokumentasikan link download-nya.
