import warnings
import pytest
from app.db.database import Base, engine
from app.db.seed import seed

# Suppress StarletteDeprecationWarning regarding httpx / httpx2 in testclient
warnings.filterwarnings("ignore", message=".*Using `httpx` with `starlette.testclient` is deprecated.*")
try:
    from starlette.exceptions import StarletteDeprecationWarning
    warnings.filterwarnings("ignore", category=StarletteDeprecationWarning)
except ImportError:
    pass


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Ensure all tables are created and seeded once per test session."""
    engine.dispose()
    Base.metadata.create_all(bind=engine)
    seed()
