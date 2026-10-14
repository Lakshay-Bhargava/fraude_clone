import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_auth_workflow_and_security():
    uid = uuid.uuid4().hex[:8]
    # 1. Register a fresh user
    user_data = {
        "full_name": f"Test Investigator {uid}",
        "email": f"test_{uid}@fraudscope.local",
        "username": f"user_{uid}",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "role": "Investigator"
    }
    r_reg = client.post("/api/auth/register", json=user_data)
    assert r_reg.status_code == 201
    reg_json = r_reg.json()
    assert reg_json["username"] == f"user_{uid}"
    assert reg_json["email"] == f"test_{uid}@fraudscope.local"
    assert reg_json["role"] == "Investigator"
    # Never return password hash!
    assert "password_hash" not in reg_json
    assert "password" not in reg_json

    # 2. Reject duplicate email
    dup_email_data = user_data.copy()
    dup_email_data["username"] = "different_user"
    r_dup_email = client.post("/api/auth/register", json=dup_email_data)
    assert r_dup_email.status_code == 409
    assert "email" in r_dup_email.json()["detail"].lower()

    # 3. Reject duplicate username
    dup_user_data = user_data.copy()
    dup_user_data["email"] = "different_email@domain.com"
    r_dup_user = client.post("/api/auth/register", json=dup_user_data)
    assert r_dup_user.status_code == 409
    assert "username" in r_dup_user.json()["detail"].lower()

    # 4. Reject password mismatch
    mismatch_data = user_data.copy()
    mismatch_data["email"] = "unique1@domain.com"
    mismatch_data["username"] = "unique1"
    mismatch_data["confirm_password"] = "Mismatch123!"
    r_mis = client.post("/api/auth/register", json=mismatch_data)
    assert r_mis.status_code == 400
    assert "match" in r_mis.json()["detail"].lower()

    # 5. Reject short password
    short_data = user_data.copy()
    short_data["email"] = "unique2@domain.com"
    short_data["username"] = "unique2"
    short_data["password"] = "short1"
    short_data["confirm_password"] = "short1"
    r_short = client.post("/api/auth/register", json=short_data)
    assert r_short.status_code in [400, 422]

    # 6. Reject self-granting Administrator role
    admin_data = user_data.copy()
    admin_data["email"] = "hacker@domain.com"
    admin_data["username"] = "hacker_admin"
    admin_data["role"] = "Administrator"
    r_admin = client.post("/api/auth/register", json=admin_data)
    assert r_admin.status_code == 403
    assert "prohibited" in r_admin.json()["detail"].lower()

    # 7. Login with valid credentials
    login_data = {
        "username_or_email": f"user_{uid}",
        "password": "SecurePassword123!"
    }
    r_login = client.post("/api/auth/login", json=login_data)
    assert r_login.status_code == 200
    login_json = r_login.json()
    assert "access_token" in login_json
    assert login_json["user"]["username"] == f"user_{uid}"
    token = login_json["access_token"]

    # 8. Access /api/auth/me with Bearer token
    r_me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r_me.status_code == 200
    assert r_me.json()["username"] == f"user_{uid}"

    # 9. Access /api/auth/me without token or cookie -> 401
    client.cookies.clear()
    r_unauth = client.get("/api/auth/me")
    assert r_unauth.status_code == 401

    # 10. Login with invalid password -> 401
    bad_login = {
        "username_or_email": f"user_{uid}",
        "password": "WrongPassword!"
    }
    r_bad = client.post("/api/auth/login", json=bad_login)
    assert r_bad.status_code == 401
    assert "invalid" in r_bad.json()["detail"].lower()

    # 11. Logout
    r_logout = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert r_logout.status_code == 200
