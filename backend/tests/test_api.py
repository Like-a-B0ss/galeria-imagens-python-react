import base64

from fastapi.testclient import TestClient

from app.main import app


PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)


def test_image_lifecycle(tmp_path, monkeypatch):
    monkeypatch.setenv("IMAGE_DATABASE_PATH", str(tmp_path / "test.db"))

    with TestClient(app) as client:
        assert client.get("/api/health").json() == {"status": "ok"}
        assert client.get("/api/images").json() == []

        created = client.post(
            "/api/images",
            files={"image": ("pixel.png", PNG_BYTES, "image/png")},
        )
        assert created.status_code == 201
        image = created.json()
        assert image["filename"] == "pixel.png"
        assert image["size"] == len(PNG_BYTES)

        listed = client.get("/api/images")
        assert listed.status_code == 200
        assert [item["id"] for item in listed.json()] == [image["id"]]

        content = client.get(image["url"])
        assert content.status_code == 200
        assert content.headers["content-type"] == "image/png"
        assert content.content == PNG_BYTES

        deleted = client.delete(f"/api/images/{image['id']}")
        assert deleted.status_code == 204
        assert client.get("/api/images").json() == []


def test_rejects_non_image(tmp_path, monkeypatch):
    monkeypatch.setenv("IMAGE_DATABASE_PATH", str(tmp_path / "test.db"))

    with TestClient(app) as client:
        response = client.post(
            "/api/images",
            files={"image": ("notes.txt", b"not an image", "text/plain")},
        )

    assert response.status_code == 415
    assert "Formato inválido" in response.json()["detail"]

