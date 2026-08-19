# CivicPulse Database Directory 🗄️

This dedicated folder houses all database instances, local SQLite storage files, backup snapshots, and database lifecycle management scripts for the **CivicPulse** platform.

---

## 📁 Directory Structure

```
backend/database_files/
├── civicpulse.db          # Local SQLite development database
├── manager.py             # CLI database management & backup utility
├── backups/               # Automated timestamped database backups
│   └── .gitkeep
└── README.md              # Database setup & architecture guide
```

---

## 🛠️ Database Management Utility (`manager.py`)

A unified CLI utility is provided for all database operations:

```bash
# Display database statistics and table row counts
python backend/database_files/manager.py status

# Run database migrations and initialize schema
python backend/database_files/manager.py init

# Seed demo data (projects, users, evidence, approval chains)
python backend/database_files/manager.py seed

# Create a timestamped backup in database_files/backups/
python backend/database_files/manager.py backup

# Export entire database to a JSON dump
python backend/database_files/manager.py export-json

# Perform SQLite VACUUM and performance integrity check
python backend/database_files/manager.py vacuum
```

---

## ⚙️ Configuration & Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | Sync connection string | `sqlite:///./database_files/civicpulse.db` |
| `ASYNC_DATABASE_URL` | Async connection string | `sqlite+aiosqlite:///./database_files/civicpulse.db` |
| `DB_POOL_SIZE` | PostgreSQL connection pool size | `20` |
| `DB_MAX_OVERFLOW` | Max connection overflow pool | `30` |

---

## 🔒 Security & Version Control

- Binary SQLite files (`*.db`, `*.sqlite`, `*.db-wal`, `*.db-shm`) and automated backups in `backups/` are automatically excluded from Git via `.gitignore`.
- Production deployments use PostgreSQL with connection pooling managed via PgBouncer.
