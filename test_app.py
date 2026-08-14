import sqlite3

import pytest
from werkzeug.security import generate_password_hash

import app as app_module


TEST_USERNAME = "testuser"
TEST_PASSWORD = "testpass"


@pytest.fixture
def anon_client(tmp_path, monkeypatch):
    monkeypatch.setattr(app_module, "DB_PATH", tmp_path / "test.db")
    monkeypatch.setattr(app_module, "AUTH_USERNAME", TEST_USERNAME)
    monkeypatch.setattr(
        app_module,
        "AUTH_PASSWORD_HASH",
        generate_password_hash(TEST_PASSWORD),
    )
    app_module.init_db()
    app_module.app.config["TESTING"] = True
    with app_module.app.test_client() as client:
        yield client


@pytest.fixture
def client(anon_client):
    anon_client.post(
        "/login", data={"username": TEST_USERNAME, "password": TEST_PASSWORD}
    )
    return anon_client


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


def test_index_requires_login(anon_client):
    response = anon_client.get("/")
    assert response.status_code == 302
    assert "/login" in response.headers["Location"]


def test_login_with_correct_credentials_grants_access(anon_client):
    response = anon_client.post(
        "/login",
        data={"username": TEST_USERNAME, "password": TEST_PASSWORD},
    )
    assert response.status_code == 302

    response = anon_client.get("/")
    assert response.status_code == 200
    assert b"Nothing on your list yet" in response.data


def test_login_with_wrong_credentials_is_rejected(anon_client):
    response = anon_client.post(
        "/login",
        data={"username": TEST_USERNAME, "password": "wrong"},
    )
    assert response.status_code == 200
    assert b"Invalid username or password" in response.data

    response = anon_client.get("/")
    assert response.status_code == 302
    assert "/login" in response.headers["Location"]


def test_logout_locks_user_out(client):
    response = client.post("/logout")
    assert response.status_code == 302

    response = client.get("/")
    assert response.status_code == 302
    assert "/login" in response.headers["Location"]
