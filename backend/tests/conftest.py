import warnings
import pytest
from app.db.database import Base, engine
from app.db.seed import seed

warnings.filterwarnings("ignore", category=DeprecationWarning)
warnings.filterwarnings("ignore", category=UserWarning)


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Ensure all tables are created and seeded once per test session."""
    engine.dispose()
    Base.metadata.create_all(bind=engine)
    seed()
