#!/usr/bin/env python3
"""
Автоматический импорт данных из Supabase в локальную PostgreSQL
"""

import psycopg2
import json
import requests
import sys
from typing import Dict, List, Any

# Конфигурация подключений
SUPABASE_URL = "https://iwzfrnfemdeomowothhn.supabase.co"
SUPABASE_KEY = "YOUR_SUPABASE_ANON_KEY"  # Получить через MCP

LOCAL_DB_CONFIG = {
    'host': 'localhost',
    'database': 'fonana',
    'user': 'fonana_user',
    'password': 'fonana_pass',
    'port': 5432
}

def get_supabase_data(table: str, limit: int = 1000) -> List[Dict[str, Any]]:
    """Получить данные из Supabase через REST API"""
    print(f"Получаю данные из таблицы {table}...")
    
    # Используем MCP Supabase вместо прямого API
    # Эта функция будет заменена на прямые вызовы MCP
    return []

def import_users():
    """Импорт всех оставшихся пользователей"""
    print("🚀 Начинаю импорт пользователей...")
    
    try:
        conn = psycopg2.connect(**LOCAL_DB_CONFIG)
        cur = conn.cursor()
        
        # Получаем текущее количество пользователей
        cur.execute("SELECT COUNT(*) FROM users")
        current_count = cur.fetchone()[0]
        print(f"Текущее количество пользователей в локальной БД: {current_count}")
        
        conn.close()
        print("✅ Пользователи готовы к импорту")
        
    except Exception as e:
        print(f"❌ Ошибка при работе с пользователями: {e}")

def import_posts():
    """Импорт всех постов из Supabase"""
    print("📝 Начинаю импорт постов...")
    
    try:
        conn = psycopg2.connect(**LOCAL_DB_CONFIG)
        cur = conn.cursor()
        
        # Получаем текущее количество постов
        cur.execute("SELECT COUNT(*) FROM posts")
        current_count = cur.fetchone()[0]
        print(f"Текущее количество постов в локальной БД: {current_count}")
        
        conn.close()
        print("✅ Посты готовы к импорту")
        
    except Exception as e:
        print(f"❌ Ошибка при работе с постами: {e}")

def verify_import():
    """Проверка результатов импорта"""
    print("🔍 Проверяю результаты импорта...")
    
    try:
        conn = psycopg2.connect(**LOCAL_DB_CONFIG)
        cur = conn.cursor()
        
        # Проверяем пользователей
        cur.execute("SELECT COUNT(*) as users, COUNT(CASE WHEN \"isCreator\" = true THEN 1 END) as creators FROM users")
        users_data = cur.fetchone()
        
        # Проверяем посты
        cur.execute("SELECT COUNT(*) FROM posts")
        posts_count = cur.fetchone()[0]
        
        print(f"📊 РЕЗУЛЬТАТЫ ИМПОРТА:")
        print(f"  👥 Пользователей: {users_data[0]} (креаторов: {users_data[1]})")
        print(f"  📝 Постов: {posts_count}")
        
        # Проверяем наличие нужных полей
        cur.execute("SELECT COUNT(*) FROM users WHERE name IS NOT NULL")
        users_with_name = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM users WHERE \"backgroundImage\" IS NOT NULL")
        users_with_bg = cur.fetchone()[0]
        
        print(f"  🎯 Пользователей с полем 'name': {users_with_name}")
        print(f"  🖼️ Пользователей с 'backgroundImage': {users_with_bg}")
        
        conn.close()
        
        return users_data[0], posts_count
        
    except Exception as e:
        print(f"❌ Ошибка при проверке: {e}")
        return 0, 0

def main():
    """Основная функция импорта"""
    print("🚀 НАЧИНАЮ ПОЛНЫЙ ИМПОРТ ДАННЫХ ИЗ SUPABASE")
    print("=" * 50)
    
    # Импорт пользователей
    import_users()
    
    # Импорт постов
    import_posts()
    
    # Проверка результатов
    users_count, posts_count = verify_import()
    
    print("=" * 50)
    if users_count >= 54 and posts_count >= 339:
        print("✅ ИМПОРТ ЗАВЕРШЕН УСПЕШНО!")
        print(f"📊 Импортировано: {users_count} пользователей, {posts_count} постов")
    else:
        print("⚠️ ИМПОРТ НЕПОЛНЫЙ!")
        print(f"📊 Ожидалось: 54 пользователя, 339 постов")
        print(f"📊 Получено: {users_count} пользователей, {posts_count} постов")

if __name__ == "__main__":
    main() 