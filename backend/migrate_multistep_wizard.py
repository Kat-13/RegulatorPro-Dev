#!/usr/bin/env python3.11
"""
Migration Script: Add Multi-Step Wizard Support
Date: November 3, 2025
Purpose: Add columns to support multi-step wizard functionality
"""

import sqlite3
import sys
from datetime import datetime

DATABASE_PATH = 'instance/regulatory_platform.db'

def check_column_exists(cursor, table_name, column_name):
    """Check if a column exists in a table"""
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = [row[1] for row in cursor.fetchall()]
    return column_name in columns

def backup_database():
    """Create a backup before migration"""
    import shutil
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = f'instance/regulatory_platform_backup_{timestamp}_pre_multistep.db'
    shutil.copy(DATABASE_PATH, backup_path)
    print(f"✅ Database backed up to: {backup_path}")
    return backup_path

def upgrade():
    """Apply migration: Add multi-step wizard columns"""
    
    print("\n" + "="*60)
    print("Multi-Step Wizard Migration - UPGRADE")
    print("="*60 + "\n")
    
    # Create backup first
    backup_path = backup_database()
    
    # Connect to database
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    try:
        # ========================================
        # 1. Add 'steps' column to application_type
        # ========================================
        print("1. Adding 'steps' column to application_type table...")
        
        if check_column_exists(cursor, 'application_type', 'steps'):
            print("   ⚠️  Column 'steps' already exists, skipping")
        else:
            cursor.execute("""
                ALTER TABLE application_type 
                ADD COLUMN steps TEXT;
            """)
            print("   ✅ Column 'steps' added successfully")
        
        # ========================================
        # 2. Add draft tracking columns to application_submissions
        # ========================================
        print("\n2. Adding draft tracking columns to application_submissions table...")
        
        # current_step
        if check_column_exists(cursor, 'application_submissions', 'current_step'):
            print("   ⚠️  Column 'current_step' already exists, skipping")
        else:
            cursor.execute("""
                ALTER TABLE application_submissions 
                ADD COLUMN current_step INTEGER DEFAULT 1;
            """)
            print("   ✅ Column 'current_step' added successfully")
        
        # last_saved_at (SQLite doesn't support DEFAULT CURRENT_TIMESTAMP in ALTER TABLE)
        if check_column_exists(cursor, 'application_submissions', 'last_saved_at'):
            print("   ⚠️  Column 'last_saved_at' already exists, skipping")
        else:
            cursor.execute("""
                ALTER TABLE application_submissions 
                ADD COLUMN last_saved_at TIMESTAMP;
            """)
            # Set default value for existing rows
            cursor.execute("""
                UPDATE application_submissions 
                SET last_saved_at = COALESCE(submitted_at, updated_at, created_at)
                WHERE last_saved_at IS NULL;
            """)
            print("   ✅ Column 'last_saved_at' added successfully")
        
        # is_draft
        if check_column_exists(cursor, 'application_submissions', 'is_draft'):
            print("   ⚠️  Column 'is_draft' already exists, skipping")
        else:
            cursor.execute("""
                ALTER TABLE application_submissions 
                ADD COLUMN is_draft BOOLEAN DEFAULT 1;
            """)
            print("   ✅ Column 'is_draft' added successfully")
        
        # steps_completed
        if check_column_exists(cursor, 'application_submissions', 'steps_completed'):
            print("   ⚠️  Column 'steps_completed' already exists, skipping")
        else:
            cursor.execute("""
                ALTER TABLE application_submissions 
                ADD COLUMN steps_completed TEXT;
            """)
            print("   ✅ Column 'steps_completed' added successfully")
        
        # ========================================
        # 3. Update existing submissions
        # ========================================
        print("\n3. Updating existing application submissions...")
        
        # Mark existing submissions as submitted (not drafts)
        cursor.execute("""
            UPDATE application_submissions 
            SET is_draft = 0 
            WHERE submitted_at IS NOT NULL;
        """)
        rows_updated = cursor.rowcount
        print(f"   ✅ Marked {rows_updated} existing submissions as submitted (is_draft = 0)")
        
        # ========================================
        # 4. Create indexes for performance
        # ========================================
        print("\n4. Creating indexes for performance...")
        
        try:
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_application_submissions_is_draft 
                ON application_submissions(is_draft);
            """)
            print("   ✅ Index on is_draft created")
        except Exception as e:
            print(f"   ⚠️  Index on is_draft: {e}")
        
        try:
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_application_submissions_user_draft 
                ON application_submissions(user_id, is_draft);
            """)
            print("   ✅ Index on user_id + is_draft created")
        except Exception as e:
            print(f"   ⚠️  Index on user_id + is_draft: {e}")
        
        try:
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_application_submissions_last_saved 
                ON application_submissions(last_saved_at);
            """)
            print("   ✅ Index on last_saved_at created")
        except Exception as e:
            print(f"   ⚠️  Index on last_saved_at: {e}")
        
        # Commit all changes
        conn.commit()
        
        print("\n" + "="*60)
        print("✅ MIGRATION SUCCESSFUL!")
        print("="*60)
        print(f"\nBackup saved at: {backup_path}")
        print("\nNew columns added:")
        print("  - application_type.steps")
        print("  - application_submissions.current_step")
        print("  - application_submissions.last_saved_at")
        print("  - application_submissions.is_draft")
        print("  - application_submissions.steps_completed")
        print("\nIndexes created for performance optimization")
        print("\n" + "="*60 + "\n")
        
        return True
        
    except Exception as e:
        print(f"\n❌ ERROR during migration: {e}")
        print(f"Rolling back changes...")
        conn.rollback()
        print(f"Database restored from backup: {backup_path}")
        return False
        
    finally:
        conn.close()

def downgrade():
    """Rollback migration: Remove multi-step wizard columns"""
    
    print("\n" + "="*60)
    print("Multi-Step Wizard Migration - DOWNGRADE")
    print("="*60 + "\n")
    print("⚠️  WARNING: This will remove multi-step wizard columns!")
    print("⚠️  All step configurations and draft progress will be lost!")
    
    response = input("\nAre you sure you want to proceed? (yes/no): ")
    if response.lower() != 'yes':
        print("Downgrade cancelled.")
        return False
    
    # Create backup first
    backup_path = backup_database()
    
    # Connect to database
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    try:
        print("\n⚠️  SQLite does not support DROP COLUMN directly.")
        print("To downgrade, you would need to:")
        print("  1. Create new tables without the columns")
        print("  2. Copy data to new tables")
        print("  3. Drop old tables")
        print("  4. Rename new tables")
        print("\nFor safety, please restore from backup instead:")
        print(f"  cp {backup_path} {DATABASE_PATH}")
        
        return False
        
    finally:
        conn.close()

def verify():
    """Verify migration was successful"""
    
    print("\n" + "="*60)
    print("Verifying Migration")
    print("="*60 + "\n")
    
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    try:
        # Check application_type
        print("1. Checking application_type table...")
        if check_column_exists(cursor, 'application_type', 'steps'):
            print("   ✅ Column 'steps' exists")
        else:
            print("   ❌ Column 'steps' NOT found")
            return False
        
        # Check application_submissions
        print("\n2. Checking application_submissions table...")
        required_columns = ['current_step', 'last_saved_at', 'is_draft', 'steps_completed']
        all_exist = True
        
        for col in required_columns:
            if check_column_exists(cursor, 'application_submissions', col):
                print(f"   ✅ Column '{col}' exists")
            else:
                print(f"   ❌ Column '{col}' NOT found")
                all_exist = False
        
        if not all_exist:
            return False
        
        # Check indexes
        print("\n3. Checking indexes...")
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='index' AND name LIKE 'idx_application_submissions%';
        """)
        indexes = cursor.fetchall()
        print(f"   ✅ Found {len(indexes)} indexes")
        for idx in indexes:
            print(f"      - {idx[0]}")
        
        # Check data
        print("\n4. Checking data integrity...")
        cursor.execute("SELECT COUNT(*) FROM application_submissions WHERE is_draft = 0")
        submitted_count = cursor.fetchone()[0]
        print(f"   ✅ {submitted_count} submitted applications (is_draft = 0)")
        
        cursor.execute("SELECT COUNT(*) FROM application_submissions WHERE is_draft = 1")
        draft_count = cursor.fetchone()[0]
        print(f"   ✅ {draft_count} draft applications (is_draft = 1)")
        
        print("\n" + "="*60)
        print("✅ VERIFICATION SUCCESSFUL!")
        print("="*60 + "\n")
        
        return True
        
    except Exception as e:
        print(f"\n❌ VERIFICATION FAILED: {e}")
        return False
        
    finally:
        conn.close()

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python migrate_multistep_wizard.py upgrade   - Apply migration")
        print("  python migrate_multistep_wizard.py verify    - Verify migration")
        print("  python migrate_multistep_wizard.py downgrade - Rollback migration")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == 'upgrade':
        success = upgrade()
        if success:
            verify()
            sys.exit(0)
        else:
            sys.exit(1)
    
    elif command == 'verify':
        success = verify()
        sys.exit(0 if success else 1)
    
    elif command == 'downgrade':
        downgrade()
        sys.exit(0)
    
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)
