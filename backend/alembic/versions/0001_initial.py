"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-04-26
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False, unique=True),
        sa.Column("slug", sa.String(100), nullable=False, unique=True),
        sa.Column("description", sa.Text()),
        sa.Column("icon", sa.String(10)),
        sa.Column("subcategories", ARRAY(sa.String()), server_default="{}"),
    )

    op.create_table(
        "ingredients",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False, unique=True),
        sa.Column("is_gluten_free", sa.Boolean(), server_default="false"),
        sa.Column("is_lactose_free", sa.Boolean(), server_default="false"),
        sa.Column("is_nut_free", sa.Boolean(), server_default="false"),
        sa.Column("is_vegan", sa.Boolean(), server_default="true"),
    )

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("username", sa.String(100), unique=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("display_name", sa.String(200)),
        sa.Column("avatar_url", sa.String(500)),
        sa.Column("bio", sa.Text()),
        sa.Column("sub_type", sa.String(20), server_default="free"),
        sa.Column("sub_until", sa.DateTime(timezone=True)),
        sa.Column("stripe_customer_id", sa.String(100)),
        sa.Column("stripe_subscription_id", sa.String(100)),
        sa.Column("streak_days", sa.Integer(), server_default="0"),
        sa.Column("last_activity", sa.DateTime(timezone=True)),
        sa.Column("followers_count", sa.Integer(), server_default="0"),
        sa.Column("following_count", sa.Integer(), server_default="0"),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("is_verified", sa.Boolean(), server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )

    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE")),
        sa.Column("token", sa.String(500), unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "recipes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("slug", sa.String(300), nullable=False, unique=True),
        sa.Column("description", sa.Text()),
        sa.Column("category_id", sa.Integer(), sa.ForeignKey("categories.id")),
        sa.Column("subcategory", sa.String(100)),
        sa.Column("difficulty", sa.Integer(), server_default="1"),
        sa.Column("prep_time", sa.Integer()),
        sa.Column("cook_time", sa.Integer()),
        sa.Column("servings", sa.Integer(), server_default="4"),
        sa.Column("main_photo", sa.String(500)),
        sa.Column("gallery", ARRAY(sa.String()), server_default="{}"),
        sa.Column("cuisine_country", sa.String(100)),
        sa.Column("season_months", ARRAY(sa.Integer()), server_default="{}"),
        sa.Column("region_tags", ARRAY(sa.String()), server_default="{}"),
        sa.Column("tags", ARRAY(sa.String()), server_default="{}"),
        sa.Column("rating", sa.Float(), server_default="0"),
        sa.Column("views", sa.Integer(), server_default="0"),
        sa.Column("favorites_count", sa.Integer(), server_default="0"),
        sa.Column("is_gluten_free", sa.Boolean(), server_default="false"),
        sa.Column("is_lactose_free", sa.Boolean(), server_default="false"),
        sa.Column("is_nut_free", sa.Boolean(), server_default="false"),
        sa.Column("is_vegan", sa.Boolean(), server_default="true"),
        sa.Column("glycemic_index", sa.Integer()),
        sa.Column("diet_tags", ARRAY(sa.String()), server_default="{}"),
        sa.Column("health_benefits", sa.Text()),
        sa.Column("contraindications", sa.Text()),
        sa.Column("recommended_for", ARRAY(sa.String()), server_default="{}"),
        sa.Column("author_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("is_published", sa.Boolean(), server_default="true"),
        sa.Column("imported_from_url", sa.String(500)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    op.create_index("ix_recipes_slug", "recipes", ["slug"])

    op.create_table(
        "recipe_ingredients",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("recipe_id", sa.Integer(), sa.ForeignKey("recipes.id", ondelete="CASCADE")),
        sa.Column("ingredient_id", sa.Integer(), sa.ForeignKey("ingredients.id")),
        sa.Column("name", sa.String(200)),
        sa.Column("amount", sa.Float()),
        sa.Column("unit", sa.String(50)),
        sa.Column("group_name", sa.String(100)),
        sa.Column("substitute_ids", ARRAY(sa.Integer()), server_default="{}"),
        sa.Column("substitute_notes", sa.Text()),
    )

    op.create_table(
        "recipe_steps",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("recipe_id", sa.Integer(), sa.ForeignKey("recipes.id", ondelete="CASCADE")),
        sa.Column("step_number", sa.Integer(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("photo_url", sa.String(500)),
        sa.Column("timer_seconds", sa.Integer()),
        sa.Column("voice_hint", sa.Text()),
    )

    op.create_table(
        "nutrition",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("recipe_id", sa.Integer(), sa.ForeignKey("recipes.id", ondelete="CASCADE"), unique=True),
        sa.Column("calories", sa.Float()),
        sa.Column("protein", sa.Float()),
        sa.Column("fat", sa.Float()),
        sa.Column("carbs", sa.Float()),
        sa.Column("fiber", sa.Float()),
        sa.Column("vitamin_a", sa.Float()),
        sa.Column("vitamin_c", sa.Float()),
        sa.Column("vitamin_d", sa.Float()),
        sa.Column("vitamin_b12", sa.Float()),
        sa.Column("iron", sa.Float()),
        sa.Column("calcium", sa.Float()),
        sa.Column("magnesium", sa.Float()),
        sa.Column("zinc", sa.Float()),
    )

    op.create_table(
        "spices",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False, unique=True),
        sa.Column("description", sa.Text()),
        sa.Column("history", sa.Text()),
        sa.Column("origin", sa.String(200)),
        sa.Column("photo_url", sa.String(500)),
        sa.Column("storage_tips", sa.Text()),
        sa.Column("substitutes", sa.Text()),
    )

    op.create_table(
        "spice_nutrition",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("spice_id", sa.Integer(), sa.ForeignKey("spices.id", ondelete="CASCADE")),
        sa.Column("element", sa.String(100)),
        sa.Column("amount_per_5g", sa.Float()),
        sa.Column("unit", sa.String(20)),
    )

    op.create_table(
        "spice_combos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("spice_id_1", sa.Integer(), sa.ForeignKey("spices.id")),
        sa.Column("spice_id_2", sa.Integer(), sa.ForeignKey("spices.id")),
        sa.Column("score", sa.Float()),
        sa.Column("notes", sa.Text()),
    )

    op.create_table(
        "achievements",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False, unique=True),
        sa.Column("description", sa.Text()),
        sa.Column("condition_type", sa.String(100)),
        sa.Column("condition_value", sa.Integer()),
        sa.Column("condition_extra", sa.String(200)),
        sa.Column("level", sa.String(20)),
        sa.Column("icon_url", sa.String(500)),
        sa.Column("points", sa.Integer(), server_default="0"),
    )

    op.create_table(
        "user_achievements",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE")),
        sa.Column("achievement_id", sa.Integer(), sa.ForeignKey("achievements.id")),
        sa.Column("earned_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("progress", sa.Integer(), server_default="0"),
    )

    op.create_table(
        "duels",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("recipe_a_id", sa.Integer(), sa.ForeignKey("recipes.id")),
        sa.Column("recipe_b_id", sa.Integer(), sa.ForeignKey("recipes.id")),
        sa.Column("votes_a", sa.Integer(), server_default="0"),
        sa.Column("votes_b", sa.Integer(), server_default="0"),
        sa.Column("category_id", sa.Integer(), sa.ForeignKey("categories.id")),
        sa.Column("week_number", sa.Integer()),
        sa.Column("year", sa.Integer()),
        sa.Column("status", sa.String(20), server_default="active"),
        sa.Column("winner_id", sa.Integer(), sa.ForeignKey("recipes.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
    )

    op.create_table(
        "duel_results",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("duel_id", sa.Integer(), sa.ForeignKey("duels.id", ondelete="CASCADE")),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("voted_recipe_id", sa.Integer(), sa.ForeignKey("recipes.id")),
        sa.Column("voted_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "health_log",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE")),
        sa.Column("recipe_id", sa.Integer(), sa.ForeignKey("recipes.id")),
        sa.Column("eaten_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("servings", sa.Float(), server_default="1"),
        sa.Column("notes", sa.Text()),
    )

    op.create_table(
        "meal_plans",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE")),
        sa.Column("week_start", sa.DateTime(timezone=True)),
        sa.Column("plan_data", sa.JSON()),
        sa.Column("daily_calories_target", sa.Integer()),
        sa.Column("shopping_list", sa.JSON()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    for table in [
        "meal_plans", "health_log", "duel_results", "duels",
        "user_achievements", "achievements",
        "spice_combos", "spice_nutrition", "spices",
        "nutrition", "recipe_steps", "recipe_ingredients", "recipes",
        "refresh_tokens", "users", "ingredients", "categories",
    ]:
        op.drop_table(table)
