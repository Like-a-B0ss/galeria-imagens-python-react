from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from .database import get_connection, initialize_database

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    yield


app = FastAPI(
    title="Galeria de Imagens API",
    description="API para armazenar imagens diretamente em um banco SQLite.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def serialize_image(row) -> dict:
    return {
        "id": row["id"],
        "filename": row["filename"],
        "content_type": row["content_type"],
        "size": row["size"],
        "created_at": row["created_at"],
        "url": f"/api/images/{row['id']}/content",
    }


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/images")
def list_images() -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT id, filename, content_type, size, created_at "
            "FROM images ORDER BY id DESC"
        ).fetchall()
    return [serialize_image(row) for row in rows]


@app.post("/api/images", status_code=status.HTTP_201_CREATED)
async def upload_image(image: Annotated[UploadFile, File(...)]) -> dict:
    if image.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Formato inválido. Envie uma imagem JPEG, PNG, WebP ou GIF.",
        )

    contents = await image.read(MAX_IMAGE_SIZE + 1)
    await image.close()

    if not contents:
        raise HTTPException(status_code=400, detail="A imagem está vazia.")
    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="A imagem deve ter no máximo 5 MB.",
        )

    filename = (image.filename or "imagem").replace("\\", "/").split("/")[-1]
    with get_connection() as connection:
        cursor = connection.execute(
            "INSERT INTO images (filename, content_type, size, data) VALUES (?, ?, ?, ?)",
            (filename, image.content_type, len(contents), contents),
        )
        row = connection.execute(
            "SELECT id, filename, content_type, size, created_at "
            "FROM images WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone()

    return serialize_image(row)


@app.get("/api/images/{image_id}/content")
def get_image_content(image_id: int) -> Response:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT filename, content_type, data FROM images WHERE id = ?",
            (image_id,),
        ).fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Imagem não encontrada.")

    return Response(
        content=row["data"],
        media_type=row["content_type"],
        headers={"Content-Disposition": f'inline; filename="{row["filename"]}"'},
    )


@app.delete("/api/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_image(image_id: int) -> Response:
    with get_connection() as connection:
        cursor = connection.execute("DELETE FROM images WHERE id = ?", (image_id,))
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Imagem não encontrada.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# No deploy, o build do React é servido pelo mesmo processo da API.
frontend_dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if frontend_dist.is_dir():
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")

