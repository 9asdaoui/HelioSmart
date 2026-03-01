"""Add catalog extraction tables

Revision ID: 2026_03_01_0001
Revises: 2026_03_01_0000
Create Date: 2026-03-01 07:47:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '2026_03_01_0001'
down_revision: Union[str, None] = '2026_03_01_0000'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create extraction_status enum
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'extractionstatus') THEN
                CREATE TYPE extractionstatus AS ENUM ('pending', 'processing', 'extracting', 'review', 'completed', 'failed');
            END IF;
        END $$;
    """)
    
    # Create stagingproductstatus enum
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stagingproductstatus') THEN
                CREATE TYPE stagingproductstatus AS ENUM ('pending', 'approved', 'rejected', 'modified');
            END IF;
        END $$;
    """)
    
    # Create product_catalog_uploads table
    op.create_table(
        'product_catalog_uploads',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('vendor_id', sa.Integer(), nullable=False),
        sa.Column('document_name', sa.String(length=255), nullable=False),
        sa.Column('document_type', sa.String(length=50), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('status', postgresql.ENUM('pending', 'processing', 'extracting', 'review', 'completed', 'failed', name='extractionstatus', create_type=False), nullable=False),
        sa.Column('progress_percentage', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('current_step', sa.String(length=100), nullable=True),
        sa.Column('extracted_products_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('validated_products_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('imported_products_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['vendor_id'], ['vendors.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_product_catalog_uploads_id'), 'product_catalog_uploads', ['id'], unique=False)
    op.create_index(op.f('ix_product_catalog_uploads_vendor_id'), 'product_catalog_uploads', ['vendor_id'], unique=False)
    
    # Create staging_products table
    op.create_table(
        'staging_products',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('upload_id', sa.Integer(), nullable=False),
        sa.Column('vendor_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('sku', sa.String(length=100), nullable=True),
        sa.Column('brand', sa.String(length=100), nullable=True),
        sa.Column('model', sa.String(length=100), nullable=True),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('subcategory', sa.String(length=100), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('specifications', sa.JSON(), nullable=True),
        sa.Column('price', sa.String(length=50), nullable=True),
        sa.Column('currency', sa.String(length=10), nullable=False, server_default='MAD'),
        sa.Column('unit', sa.String(length=50), nullable=True),
        sa.Column('stock_quantity', sa.Integer(), nullable=True),
        sa.Column('availability_status', sa.String(length=50), nullable=True),
        sa.Column('warranty_years', sa.Integer(), nullable=True),
        sa.Column('warranty_description', sa.Text(), nullable=True),
        sa.Column('image_urls', sa.JSON(), nullable=True),
        sa.Column('datasheet_url', sa.String(length=500), nullable=True),
        sa.Column('extraction_confidence', sa.Float(), nullable=True),
        sa.Column('source_page', sa.Integer(), nullable=True),
        sa.Column('raw_extraction_data', sa.JSON(), nullable=True),
        sa.Column('status', postgresql.ENUM('pending', 'approved', 'rejected', 'modified', name='stagingproductstatus', create_type=False), nullable=False),
        sa.Column('vendor_notes', sa.Text(), nullable=True),
        sa.Column('imported_product_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['upload_id'], ['product_catalog_uploads.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['vendor_id'], ['vendors.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['imported_product_id'], ['products.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_staging_products_id'), 'staging_products', ['id'], unique=False)
    op.create_index(op.f('ix_staging_products_upload_id'), 'staging_products', ['upload_id'], unique=False)
    op.create_index(op.f('ix_staging_products_vendor_id'), 'staging_products', ['vendor_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_staging_products_vendor_id'), table_name='staging_products')
    op.drop_index(op.f('ix_staging_products_upload_id'), table_name='staging_products')
    op.drop_index(op.f('ix_staging_products_id'), table_name='staging_products')
    op.drop_table('staging_products')
    
    op.drop_index(op.f('ix_product_catalog_uploads_vendor_id'), table_name='product_catalog_uploads')
    op.drop_index(op.f('ix_product_catalog_uploads_id'), table_name='product_catalog_uploads')
    op.drop_table('product_catalog_uploads')
    
    op.execute("DROP TYPE IF EXISTS stagingproductstatus;")
    op.execute("DROP TYPE IF EXISTS extractionstatus;")
