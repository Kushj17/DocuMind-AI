import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.base import Base
from app.core.dependencies import get_db


# Use in-memory SQLite for tests
SQLALCHEMY_TEST_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    """Create all tables before tests, drop after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="module")
def client():
    """Test client for API calls."""
    with TestClient(app) as c:
        yield c


@pytest.fixture
def db_session():
    """Get a test database session."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def test_user_data():
    """Generate unique test user data."""
    unique = uuid.uuid4().hex[:8]
    return {
        "name": f"Test User {unique}",
        "email": f"test_{unique}@example.com",
        "password": "testpassword123"
    }


@pytest.fixture
def registered_user(client, test_user_data):
    """Register a user and return their data + token."""
    response = client.post("/api/auth/register", json=test_user_data)
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {
        **test_user_data,
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"}
    }


@pytest.fixture
def auth_headers(registered_user):
    """Get auth headers for a registered user."""
    return registered_user["headers"]
