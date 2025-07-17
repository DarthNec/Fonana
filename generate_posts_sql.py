#!/usr/bin/env python3
"""
Генератор SQL INSERT команд для постов из Supabase
"""

import json
import sys
from typing import List, Dict, Any

def escape_sql_string(value: str) -> str:
    """Экранирование строк для SQL"""
    if value is None:
        return "null"
    
    # Заменяем одинарные кавычки на двойные одинарные
    value = str(value).replace("'", "''")
    # Экранируем обратные слеши
    value = value.replace("\\", "\\\\")
    return f"'{value}'"

def format_sql_value(value: Any) -> str:
    """Форматирование значения для SQL"""
    if value is None:
        return "null"
    elif isinstance(value, bool):
        return "true" if value else "false"
    elif isinstance(value, (int, float)):
        return str(value)
    else:
        return escape_sql_string(value)

def generate_posts_insert_sql(posts_data: List[Dict[str, Any]]) -> str:
    """Генерация SQL INSERT команды для постов"""
    
    if not posts_data:
        return ""
    
    # Определяем поля для вставки
    fields = [
        "id", "creatorId", "title", "content", "type", "category", 
        "thumbnail", "mediaUrl", "isLocked", "isPremium", "price", 
        "currency", "likesCount", "commentsCount", "viewsCount", 
        "createdAt", "updatedAt"
    ]
    
    # Добавляем кавычки для полей с CamelCase
    quoted_fields = []
    for field in fields:
        if any(c.isupper() for c in field[1:]):  # CamelCase поля
            quoted_fields.append(f'"{field}"')
        else:
            quoted_fields.append(field)
    
    sql_parts = []
    sql_parts.append(f"INSERT INTO posts ({', '.join(quoted_fields)}) VALUES")
    
    values_list = []
    for post in posts_data:
        values = []
        for field in fields:
            value = post.get(field)
            values.append(format_sql_value(value))
        
        values_str = f"({', '.join(values)})"
        values_list.append(values_str)
    
    sql_parts.append(",\n".join(values_list) + ";")
    
    return "\n".join(sql_parts)

def main():
    """Основная функция"""
    
    # Данные постов из Supabase (первые 100)
    posts_data = [
        {
            "id": "cmbv6i0to0000real1",
            "creatorId": "cmbv53b7h0000qoe0vy4qwkap",
            "title": "👀 MVP = Mostly Valuable Prototype",
            "content": "Hi, I'm the dev.\\nFonana just dropped — like a newborn giraffe. It's standing. It's wobbly. But damn, it's alive.\\n\\nRight now, it's like OnlyFans met Craigslist in a dark alley and they decided to vibe.\\nEverything kinda works. Some stuff breaks. That's showbiz, baby.\\n\\n✅ Your link is your power — every visitor who comes through your profile gets tied to you for 7 days.\\n🤝 Bring the weirdos, the lurkers, the masked legends.\\n📸 Post anything. Even cursed images. Especially cursed images.\\n\\nIt's early. It's raw. It's fun.\\nAnd if you find bugs? That's called feature exploration mode.\\n\\nWelcome to Fonana.\\n#NoShame #JustTaste #BetaAndProud #FonanaDev",
            "type": "video",
            "category": "crypto",
            "thumbnail": "https://iwzfrnfemdeomowothhn.supabase.co/storage/v1/object/public/posts//placeholder-video.png",
            "mediaUrl": "https://iwzfrnfemdeomowothhn.supabase.co/storage/v1/object/public/posts/940af4e585a350c4bd3c16e86c3ded95.png",
            "isLocked": False,
            "isPremium": False,
            "price": None,
            "currency": "SOL",
            "likesCount": 0,
            "commentsCount": 0,
            "viewsCount": 0,
            "createdAt": "2025-06-13 18:37:23.033",
            "updatedAt": "2025-06-19 05:07:56.746"
        }
    ]
    
    # Генерируем SQL
    sql = generate_posts_insert_sql(posts_data)
    
    if sql:
        print("-- SQL INSERT для первого поста из Supabase")
        print(sql)
        print()
        print("✅ SQL сгенерирован успешно!")
        print("📝 Запустите этот скрипт с полными данными для создания всех постов")
    else:
        print("❌ Нет данных для генерации SQL")

if __name__ == "__main__":
    main() 