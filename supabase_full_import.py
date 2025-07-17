#!/usr/bin/env python3
"""
Полный импорт ВСЕХ данных из Supabase в локальную PostgreSQL
"""

import psycopg2
import sys
from datetime import datetime

# Конфигурация локальной БД
LOCAL_DB = {
    'host': 'localhost',
    'database': 'fonana',
    'user': 'fonana_user', 
    'password': 'fonana_pass',
    'port': 5432
}

def escape_sql_string(value):
    """Экранирование строк для SQL"""
    if value is None:
        return "null"
    
    # Заменяем одинарные кавычки
    value = str(value).replace("'", "''")
    # Экранируем обратные слеши
    value = value.replace("\\", "\\\\")
    return f"'{value}'"

def format_sql_value(value):
    """Форматирование значения для SQL"""
    if value is None:
        return "null"
    elif isinstance(value, bool):
        return "true" if value else "false"
    elif isinstance(value, (int, float)):
        return str(value)
    else:
        return escape_sql_string(value)

def import_posts_batch(conn, posts, start_idx=0):
    """Импорт партии постов"""
    cursor = conn.cursor()
    
    for idx, post in enumerate(posts):
        try:
            sql = f"""
INSERT INTO posts (id, "creatorId", title, content, type, category, thumbnail, "mediaUrl", 
                  "isLocked", "isPremium", price, currency, "likesCount", "commentsCount", 
                  "viewsCount", "createdAt", "updatedAt") 
VALUES ({format_sql_value(post['id'])}, {format_sql_value(post['creatorId'])}, 
        {format_sql_value(post['title'])}, {format_sql_value(post['content'])}, 
        {format_sql_value(post['type'])}, {format_sql_value(post['category'])}, 
        {format_sql_value(post['thumbnail'])}, {format_sql_value(post['mediaUrl'])}, 
        {post['isLocked']}, {post['isPremium']}, {post['price']}, 
        {format_sql_value(post['currency'])}, {post['likesCount']}, {post['commentsCount']}, 
        {post['viewsCount']}, {format_sql_value(post['createdAt'])}, 
        {format_sql_value(post['updatedAt'])})
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    content = EXCLUDED.content,
    "likesCount" = EXCLUDED."likesCount",
    "commentsCount" = EXCLUDED."commentsCount",
    "viewsCount" = EXCLUDED."viewsCount";
"""
            cursor.execute(sql)
            print(f"✓ Пост {start_idx + idx + 1}: {post['title'][:50]}...")
        except Exception as e:
            print(f"✗ Ошибка с постом {post['id']}: {str(e)}")
            conn.rollback()
            continue
    
    conn.commit()
    cursor.close()

def import_all_data(all_posts_data, all_comments_data, all_likes_data, all_notifications_data, all_tags_data):
    """Основная функция импорта"""
    try:
        # Подключение к локальной БД
        conn = psycopg2.connect(**LOCAL_DB)
        print("✅ Подключено к локальной PostgreSQL")
        
        # 1. Импорт постов
        print(f"\n📝 Импорт {len(all_posts_data)} постов...")
        import_posts_batch(conn, all_posts_data)
        
        # 2. Импорт комментариев  
        if all_comments_data:
            print(f"\n💬 Импорт {len(all_comments_data)} комментариев...")
            cursor = conn.cursor()
            for comment in all_comments_data:
                try:
                    sql = f"""
INSERT INTO comments (id, "postId", "userId", content, "createdAt", "updatedAt")
VALUES ({format_sql_value(comment['id'])}, {format_sql_value(comment['postId'])}, 
        {format_sql_value(comment['userId'])}, {format_sql_value(comment['content'])},
        {format_sql_value(comment['createdAt'])}, {format_sql_value(comment['updatedAt'])})
ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content;
"""
                    cursor.execute(sql)
                except Exception as e:
                    print(f"✗ Ошибка с комментарием {comment['id']}: {str(e)}")
                    conn.rollback()
            conn.commit()
            cursor.close()
        
        # 3. Импорт лайков
        if all_likes_data:
            print(f"\n❤️ Импорт {len(all_likes_data)} лайков...")
            cursor = conn.cursor()
            for like in all_likes_data:
                try:
                    sql = f"""
INSERT INTO likes (id, "postId", "userId", "createdAt")
VALUES ({format_sql_value(like['id'])}, {format_sql_value(like['postId'])}, 
        {format_sql_value(like['userId'])}, {format_sql_value(like['createdAt'])})
ON CONFLICT (id) DO NOTHING;
"""
                    cursor.execute(sql)
                except Exception as e:
                    print(f"✗ Ошибка с лайком {like['id']}: {str(e)}")
                    conn.rollback()
            conn.commit()
            cursor.close()
        
        # 4. Импорт уведомлений
        if all_notifications_data:
            print(f"\n📢 Импорт {len(all_notifications_data)} уведомлений...")
            cursor = conn.cursor()
            for notif in all_notifications_data:
                try:
                    sql = f"""
INSERT INTO notifications (id, "userId", type, message, "isRead", "createdAt", "relatedId")
VALUES ({format_sql_value(notif['id'])}, {format_sql_value(notif['userId'])}, 
        {format_sql_value(notif['type'])}, {format_sql_value(notif['message'])},
        {notif.get('isRead', False)}, {format_sql_value(notif['createdAt'])},
        {format_sql_value(notif.get('relatedId'))})
ON CONFLICT (id) DO UPDATE SET "isRead" = EXCLUDED."isRead";
"""
                    cursor.execute(sql)
                except Exception as e:
                    print(f"✗ Ошибка с уведомлением {notif['id']}: {str(e)}")
                    conn.rollback()
            conn.commit()
            cursor.close()
        
        # 5. Импорт тегов
        if all_tags_data:
            print(f"\n🏷️ Импорт {len(all_tags_data)} тегов...")
            cursor = conn.cursor()
            for tag in all_tags_data:
                try:
                    sql = f"""
INSERT INTO tags (id, name, "usageCount", "createdAt")
VALUES ({format_sql_value(tag['id'])}, {format_sql_value(tag['name'])}, 
        {tag.get('usageCount', 0)}, {format_sql_value(tag['createdAt'])})
ON CONFLICT (id) DO UPDATE SET "usageCount" = EXCLUDED."usageCount";
"""
                    cursor.execute(sql)
                except Exception as e:
                    print(f"✗ Ошибка с тегом {tag['id']}: {str(e)}")
                    conn.rollback()
            conn.commit()
            cursor.close()
        
        # Финальная статистика
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM posts")
        posts_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM comments")
        comments_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM likes")
        likes_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM notifications")
        notifs_count = cursor.fetchone()[0]
        cursor.close()
        
        print(f"\n✅ ИМПОРТ ЗАВЕРШЕН!")
        print(f"📊 Итоговая статистика в локальной БД:")
        print(f"   - Посты: {posts_count}")
        print(f"   - Комментарии: {comments_count}")
        print(f"   - Лайки: {likes_count}")
        print(f"   - Уведомления: {notifs_count}")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Критическая ошибка: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    print("🚀 Запуск полного импорта данных из Supabase...")
    print("⚠️  Этот скрипт требует предварительного получения данных через MCP Supabase")
    print("   Используйте его вместе с основным процессом импорта") 