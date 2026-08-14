import sqlite3

import pytest

import app as app_module


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(app_module, "DB_PATH", tmp_path / "test.db")
    app_module.init_db()
    app_module.app.config["TESTING"] = True
    with app_module.app.test_client() as client:
        yield client


def test_index_shows_empty_state(client):
    response = client.get("/")
    assert response.status_code == 200
    assert b"Nothing on your list yet" in response.data


def test_add_task_appears_in_list(client):
    client.post("/add", data={"title": "Buy milk", "priority": "high"})
    response = client.get("/")
    assert b"Buy milk" in response.data


def test_add_task_requires_title(client):
    client.post("/add", data={"title": "  ", "priority": "medium"})
    response = client.get("/")
    assert b"Nothing on your list yet" in response.data


def test_toggle_task_marks_done(client):
    client.post("/add", data={"title": "Water plants", "priority": "low"})
    conn = sqlite3.connect(app_module.DB_PATH)
    task_id = conn.execute(
        "SELECT id FROM tasks WHERE title = ?", ("Water plants",)
    ).fetchone()[0]
    conn.close()

    client.post(f"/toggle/{task_id}")

    conn = sqlite3.connect(app_module.DB_PATH)
    done = conn.execute(
        "SELECT done FROM tasks WHERE id = ?", (task_id,)
    ).fetchone()[0]
    conn.close()
    assert done == 1
