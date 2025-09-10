#!/usr/bin/env python3
"""
Convert SQLite dump to PostgreSQL format
"""

import re
import sys

def convert_sqlite_to_postgres(input_file, output_file):
    with open(input_file, 'r') as f:
        sql = f.read()
    
    # Remove SQLite specific commands
    sql = re.sub(r'PRAGMA.*?;', '', sql)
    sql = re.sub(r'BEGIN TRANSACTION;', 'BEGIN;', sql)
    sql = re.sub(r'COMMIT;', 'COMMIT;', sql)
    
    # Replace SQLite types with PostgreSQL types
    sql = re.sub(r'\bINTEGER PRIMARY KEY AUTOINCREMENT\b', 'SERIAL PRIMARY KEY', sql)
    sql = re.sub(r'\bAUTOINCREMENT\b', '', sql)
    sql = re.sub(r'\bDATETIME\b', 'TIMESTAMP', sql)
    sql = re.sub(r'\bCURRENT_TIMESTAMP\b', 'NOW()', sql)
    
    # Fix boolean values
    sql = re.sub(r'\bBOOLEAN DEFAULT 0\b', 'BOOLEAN DEFAULT FALSE', sql)
    sql = re.sub(r'\bBOOLEAN DEFAULT 1\b', 'BOOLEAN DEFAULT TRUE', sql)
    
    # Replace double quotes with single quotes for string literals
    sql = re.sub(r'INSERT INTO .*? VALUES', lambda m: m.group(0), sql)
    
    # Fix CHECK constraints
    sql = re.sub(r'CHECK\((.*?)\)', lambda m: 'CHECK(' + m.group(1) + ')', sql)
    
    # Remove IF NOT EXISTS from CREATE TABLE (Supabase handles this)
    sql = re.sub(r'CREATE TABLE IF NOT EXISTS', 'CREATE TABLE', sql)
    
    # Add IF NOT EXISTS to CREATE TABLE for safety in Supabase
    sql = re.sub(r'CREATE TABLE (\w+)', r'CREATE TABLE IF NOT EXISTS \1', sql)
    
    with open(output_file, 'w') as f:
        f.write(sql)
    
    print(f"Converted {input_file} to {output_file}")

if __name__ == "__main__":
    convert_sqlite_to_postgres(
        '/Users/scottkaufman/Dropbox/01. Personal Master Folder/30-39 Music, Coding & Creative/38 Coding Projects/family-planner/database/family_export.sql',
        '/Users/scottkaufman/Dropbox/01. Personal Master Folder/30-39 Music, Coding & Creative/38 Coding Projects/family-planner/database/family_postgres.sql'
    )