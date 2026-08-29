"""Tests for document endpoints."""
import pytest
from io import BytesIO


class TestDocuments:
    """Test document management."""

    def test_upload_document_success(self, client, auth_headers):
        # Create a mock PDF file
        file_content = b"%PDF-1.4\n%EOF"
        files = {"file": ("test.pdf", file_content, "application/pdf")}
        
        response = client.post("/api/documents/upload", files=files, headers=auth_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["filename"] != "test.pdf"
        assert data["original_filename"] == "test.pdf"
        assert data["status"] == "processing"
        
    def test_upload_invalid_type(self, client, auth_headers):
        files = {"file": ("test.txt", b"Hello", "text/plain")}
        
        response = client.post("/api/documents/upload", files=files, headers=auth_headers)
        assert response.status_code == 400
        assert "Only PDF files are accepted" in response.json()["detail"]
        
    def test_list_documents(self, client, auth_headers):
        response = client.get("/api/documents", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "documents" in data
        assert "total" in data

    def test_unauthorized_access(self, client):
        response = client.get("/api/documents")
        assert response.status_code == 401
