"""add email verification and password reset fields to users

Revision ID: 0003_email_verification
Revises: 0002_favorites_ratings
Create Date: 2026-05-09
"""
from alembic import op
import sqlalchemy as sa

revision = "0003_email_verification"
down_revision = "0002_favorites_ratings"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("email_verify_token", sa.String(86), nullable=True))
    op.add_column("users", sa.Column("password_reset_token", sa.String(86), nullable=True))
    op.add_column("users", sa.Column("password_reset_expires", sa.DateTime(timezone=True), nullable=True))

    op.create_index("ix_users_email_verify_token", "users", ["email_verify_token"])
    op.create_index("ix_users_password_reset_token", "users", ["password_reset_token"])


def downgrade() -> None:
    op.drop_index("ix_users_password_reset_token", table_name="users")
    op.drop_index("ix_users_email_verify_token", table_name="users")
    op.drop_column("users", "password_reset_expires")
    op.drop_column("users", "password_reset_token")
    op.drop_column("users", "email_verify_token")
