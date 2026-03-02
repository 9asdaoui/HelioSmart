"""add_users_table_and_vendor_id_to_panels_inverters

Revision ID: b2c3d4e5f601
Revises: a1b2c3d4e5f6
Create Date: 2026-03-02 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f601"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Create users table ─────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True, index=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="user"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("company_name", sa.String(255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=True,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ── 2. Add vendor_id to panels ────────────────────────────────────────────
    op.add_column(
        "panels",
        sa.Column("vendor_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_panels_vendor_id",
        "panels",
        "users",
        ["vendor_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_panels_vendor_id", "panels", ["vendor_id"])

    # ── 3. Add vendor_id to inverters ─────────────────────────────────────────
    op.add_column(
        "inverters",
        sa.Column("vendor_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_inverters_vendor_id",
        "inverters",
        "users",
        ["vendor_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_inverters_vendor_id", "inverters", ["vendor_id"])


def downgrade() -> None:
    # ── 3. Remove vendor_id from inverters ───────────────────────────────────
    op.drop_index("ix_inverters_vendor_id", table_name="inverters")
    op.drop_constraint("fk_inverters_vendor_id", "inverters", type_="foreignkey")
    op.drop_column("inverters", "vendor_id")

    # ── 2. Remove vendor_id from panels ──────────────────────────────────────
    op.drop_index("ix_panels_vendor_id", table_name="panels")
    op.drop_constraint("fk_panels_vendor_id", "panels", type_="foreignkey")
    op.drop_column("panels", "vendor_id")

    # ── 1. Drop users table ───────────────────────────────────────────────────
    op.drop_table("users")
