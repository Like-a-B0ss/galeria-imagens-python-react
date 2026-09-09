# Galeria de Imagens — Python + React

Aplicação full stack desenvolvida para a atividade prática de Python + React. A API recebe imagens e salva o conteúdo binário diretamente em um banco de dados SQLite. A interface permite enviar, listar, pré-visualizar e excluir imagens.

## Tecnologias

- **Backend:** Python, FastAPI e SQLite
- **Frontend:** React e Vite
- **Testes:** Pytest e FastAPI TestClient

## Funcionalidades

- Upload por seletor de arquivo ou arrastar e soltar
- Validação de formato (JPEG, PNG, WebP e GIF) e limite de 5 MB
- Persistência da imagem como `BLOB` no SQLite
- Galeria responsiva com tamanho e nome dos arquivos
- Pré-visualização ampliada em modal
- Exclusão de imagens
- Documentação interativa da API em `/docs`

## Como executar

Requisitos: Python 3.10+ e Node.js 20+.

### 1. API

```bash
cd backend
python -m venv .venv
# Windows (PowerShell): .venv\Scripts\Activate.ps1
# Linux/macOS: source .venv/bin/activate
python -m pip install -r requirements.txt
uvicorn app.main:app --reload
```

A API ficará disponível em <http://127.0.0.1:8000>.

### 2. Interface

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

Abra <http://localhost:5173>. Durante o desenvolvimento, o Vite encaminha as requisições `/api` para o FastAPI.

## Testes e validação

```bash
cd backend
python -m pip install -r requirements-dev.txt
python -m pytest -q

cd ../frontend
npm run lint
npm run build
```

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/health` | Verifica a disponibilidade da API |
| `GET` | `/api/images` | Lista os metadados das imagens |
| `POST` | `/api/images` | Salva uma imagem enviada no campo `image` |
| `GET` | `/api/images/{id}/content` | Retorna o conteúdo binário da imagem |
| `DELETE` | `/api/images/{id}` | Exclui uma imagem |

O banco é criado automaticamente em `backend/data/images.db` na primeira execução e não é versionado.
