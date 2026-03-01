"""add_site_plan_snapshot

Revision ID: a1b2c3d4e5f6
Revises: 173427db018c
Create Date: 2026-03-01 00:01:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '173427db018c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('estimations', sa.Column('site_plan_snapshot', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('estimations', 'site_plan_snapshot')
