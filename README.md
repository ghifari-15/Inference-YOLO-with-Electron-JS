# YOLO FastAPI + Electron

Aplikasi ini menggunakan FastAPI sebagai backend inference model `yolo26n.pt` dan Electron sebagai frontend desktop.

## Setup Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Jalankan Backend

```bash
fastapi dev main.py --host 127.0.0.1 --port 8000
```

Endpoint yang tersedia:

- `GET /health`
- `POST /predict` dengan form-data field `file`

## Jalankan Frontend

Di terminal lain:

```bash
npm install
npm start
```

Pastikan file model `yolo26n.pt` berada di root proyek.
