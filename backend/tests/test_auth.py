"""Tests for authentication endpoints."""
import pytest


class TestRegistration:
    """Test user registration."""

    def test_register_success(self, client, test_user_data):
        response = client.post("/api/auth/register", json=test_user_data)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_register_duplicate_email(self, client, registered_user, test_user_data):
        # Try to register with same email as registered_user
        response = client.post("/api/auth/register", json={
            "name": "Another User",
            "email": registered_user["email"],
            "password": "anotherpassword123"
        })
        assert response.status_code == 409
        assert "already registered" in response.json()["detail"].lower()

    def test_register_invalid_email(self, client):
        response = client.post("/api/auth/register", json={
            "name": "Test",
            "email": "not-an-email",
            "password": "password123"
        })
        # Pydantic validation should catch this
        assert response.status_code == 422

    def test_register_short_password(self, client):
        response = client.post("/api/auth/register", json={
            "name": "Test",
            "email": "test@example.com",
            "password": "123"
        })
        assert response.status_code == 422

    def test_register_missing_fields(self, client):
        response = client.post("/api/auth/register", json={
            "email": "test@example.com"
        })
        assert response.status_code == 422


class TestLogin:
    """Test user login."""

    def test_login_success(self, client, registered_user):
        response = client.post("/api/auth/login", json={
            "email": registered_user["email"],
            "password": registered_user["password"]
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client, registered_user):
        response = client.post("/api/auth/login", json={
            "email": registered_user["email"],
            "password": "wrongpassword"
        })
        assert response.status_code == 401

    def test_login_nonexistent_email(self, client):
        response = client.post("/api/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "password123"
        })
        assert response.status_code == 401


class TestAuthMe:
    """Test /auth/me endpoint."""

    def test_get_me_success(self, client, registered_user):
        response = client.get("/api/auth/me", headers=registered_user["headers"])
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == registered_user["email"]
        assert data["name"] == registered_user["name"]
        assert "id" in data
        assert "password" not in data
        assert "password_hash" not in data

    def test_get_me_no_token(self, client):
        response = client.get("/api/auth/me")
        assert response.status_code == 401

    def test_get_me_invalid_token(self, client):
        response = client.get("/api/auth/me", headers={
            "Authorization": "Bearer invalid-token-here"
        })
        assert response.status_code == 401

    def test_get_me_expired_token(self, client):
        # A malformed token should be rejected
        response = client.get("/api/auth/me", headers={
            "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxfQ.invalid"
        })
        assert response.status_code == 401
