"""add user_favorites and user_recipe_ratings tables

Revision ID: 0002_favorites_ratings
Revises: 0001_initial
Create Date: 2026-05-09
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_favorites_ratings"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_favorites",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("recipe_id", sa.Integer(), sa.ForeignKey("recipes.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_user_favorites_user_id", "user_favorites", ["user_id"])
    op.create_index("ix_user_favorites_recipe_id", "user_favorites", ["recipe_id"])

    op.create_table(
        "user_recipe_ratings",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("recipe_id", sa.Integer(), sa.ForeignKey("recipes.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("rating", sa.SmallInteger(), nullable=False),  # 1–5
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index("ix_user_recipe_ratings_recipe_id", "user_recipe_ratings", ["recipe_id"])


def downgrade() -> None:
    op.drop_table("user_recipe_ratings")
    op.drop_table("user_favorites")
