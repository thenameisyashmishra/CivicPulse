"""Initial Enterprise High-Scale Database Schema (10M Users Capability)

Revision ID: 001_enterprise_schema
Revises: 
Create Date: 2026-08-19 12:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '001_enterprise_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Enable PostGIS & pg_stat_statements (if running PostgreSQL) ---
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        try:
            op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
            op.execute("CREATE EXTENSION IF NOT EXISTS pg_stat_statements")
        except Exception:
            pass

    # --- USERS TABLE ---
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('role', sa.Enum('citizen', 'pradhan', 'engineer', 'admin', name='userrole'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('aadhaar_verified', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('aadhaar_last_4', sa.String(length=4), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_role_active', 'users', ['role', 'is_active'])
    op.create_index('ix_users_created_at', 'users', ['created_at'])

    # --- PROJECTS TABLE ---
    op.create_table(
        'projects',
        sa.Column('id', sa.String(length=32), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('type', sa.String(length=100), nullable=False),
        sa.Column('location', sa.String(length=200), nullable=False),
        sa.Column('contractor', sa.String(length=200), nullable=False),
        sa.Column('budget', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('spent', sa.Numeric(precision=15, scale=2), nullable=False, server_default='0'),
        sa.Column('progress', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('status', sa.Enum('active', 'completed', 'delayed', 'flagged', name='projectstatus'), nullable=False),
        sa.Column('start_date', sa.String(length=20), nullable=False),
        sa.Column('end_date', sa.String(length=20), nullable=False),
        sa.Column('lat', sa.Float(), nullable=False),
        sa.Column('lng', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_projects_status_created', 'projects', ['status', 'created_at'])
    op.create_index('ix_projects_type_status', 'projects', ['type', 'status'])
    op.create_index('ix_projects_lat_lng', 'projects', ['lat', 'lng'])

    # --- EVIDENCE TABLE ---
    op.create_table(
        'evidence',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.String(length=32), nullable=False),
        sa.Column('uploaded_by_id', sa.Integer(), nullable=False),
        sa.Column('image_path', sa.String(length=500), nullable=False),
        sa.Column('caption', sa.String(length=300), nullable=True),
        sa.Column('gps_lat', sa.Float(), nullable=True),
        sa.Column('gps_lng', sa.Float(), nullable=True),
        sa.Column('captured_at', sa.String(length=40), nullable=True),
        sa.Column('distance_from_site_m', sa.Float(), nullable=True),
        sa.Column('within_geofence', sa.Boolean(), nullable=True),
        sa.Column('phash', sa.String(length=64), nullable=True),
        sa.Column('is_duplicate', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('duplicate_of_id', sa.Integer(), nullable=True),
        sa.Column('quality_score', sa.Float(), nullable=True),
        sa.Column('completion_estimate', sa.Float(), nullable=True),
        sa.Column('ai_confidence', sa.Float(), nullable=True),
        sa.Column('ai_status', sa.Enum('pending', 'review', 'verified', 'failed', name='evidencestatus'), nullable=False),
        sa.Column('ai_findings', sa.JSON(), nullable=False),
        sa.Column('ai_analysis', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('pending', 'review', 'verified', 'failed', name='evidencestatus'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['duplicate_of_id'], ['evidence.id'], ),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
        sa.ForeignKeyConstraint(['uploaded_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_evidence_project_id', 'evidence', ['project_id'])
    op.create_index('ix_evidence_project_status', 'evidence', ['project_id', 'status'])
    op.create_index('ix_evidence_uploaded_by', 'evidence', ['uploaded_by_id'])
    op.create_index('ix_evidence_phash', 'evidence', ['phash'])
    op.create_index('ix_evidence_gps', 'evidence', ['gps_lat', 'gps_lng'])
    op.create_index('ix_evidence_status_created', 'evidence', ['status', 'created_at'])

    # --- VOTES TABLE ---
    op.create_table(
        'votes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('evidence_id', sa.Integer(), nullable=False),
        sa.Column('citizen_id', sa.Integer(), nullable=False),
        sa.Column('choice', sa.Enum('completed', 'incomplete', name='votechoice'), nullable=False),
        sa.Column('comment', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['citizen_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['evidence_id'], ['evidence.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('evidence_id', 'citizen_id', name='uq_one_vote_per_citizen')
    )
    op.create_index('ix_votes_evidence_choice', 'votes', ['evidence_id', 'choice'])
    op.create_index('ix_votes_citizen_id', 'votes', ['citizen_id'])

    # --- APPROVAL STEPS TABLE ---
    op.create_table(
        'approval_steps',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('evidence_id', sa.Integer(), nullable=False),
        sa.Column('level', sa.Enum('pradhan', 'engineer', 'admin', name='approvallevel'), nullable=False),
        sa.Column('decision', sa.Enum('pending', 'approved', 'rejected', 'escalated', name='approvaldecision'), nullable=False),
        sa.Column('reviewer_id', sa.Integer(), nullable=True),
        sa.Column('remarks', sa.String(length=500), nullable=True),
        sa.Column('decided_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['evidence_id'], ['evidence.id'], ),
        sa.ForeignKeyConstraint(['reviewer_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_approval_evidence_level', 'approval_steps', ['evidence_id', 'level'])
    op.create_index('ix_approval_reviewer_decision', 'approval_steps', ['reviewer_id', 'decision'])
    op.create_index('ix_approval_created_at', 'approval_steps', ['created_at'])

    # --- PostgreSQL Specialized Indexes (JSONB GIN, BRIN, Partial B-Tree) ---
    if bind.dialect.name == "postgresql":
        try:
            op.execute("ALTER TABLE evidence ALTER COLUMN ai_findings TYPE JSONB USING ai_findings::jsonb")
            op.execute("CREATE INDEX IF NOT EXISTS ix_evidence_ai_findings_gin ON evidence USING GIN (ai_findings)")
            op.execute("CREATE INDEX IF NOT EXISTS ix_approval_created_at_brin ON approval_steps USING BRIN (created_at)")
            op.execute("CREATE INDEX IF NOT EXISTS ix_evidence_created_at_brin ON evidence USING BRIN (created_at)")
            op.execute("CREATE INDEX IF NOT EXISTS ix_evidence_pending ON evidence (status, created_at) WHERE status = 'pending'")
            op.execute("CREATE INDEX IF NOT EXISTS ix_evidence_review ON evidence (status, created_at) WHERE status = 'review'")
        except Exception:
            pass


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        try:
            op.execute("DROP INDEX IF EXISTS ix_evidence_ai_findings_gin")
            op.execute("DROP INDEX IF EXISTS ix_approval_created_at_brin")
            op.execute("DROP INDEX IF EXISTS ix_evidence_created_at_brin")
            op.execute("DROP INDEX IF EXISTS ix_evidence_pending")
            op.execute("DROP INDEX IF EXISTS ix_evidence_review")
        except Exception:
            pass

    op.drop_table('approval_steps')
    op.drop_table('votes')
    op.drop_table('evidence')
    op.drop_table('projects')
    op.drop_table('users')

    # Drop PostgreSQL Enum Types
    if bind.dialect.name == "postgresql":
        for enum_type in ['approvaldecision', 'approvallevel', 'evidencestatus', 'votechoice', 'projectstatus', 'userrole']:
            try:
                op.execute(f"DROP TYPE IF EXISTS {enum_type}")
            except Exception:
                pass
