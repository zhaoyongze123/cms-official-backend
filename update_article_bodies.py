#!/usr/bin/env python3
"""
文章正文迁移脚本
从 /tmp/cms-migration/articles.json 读取文章数据，批量更新到 cms 数据库
"""

import json
import sys
import psycopg2
from psycopg2 import sql

# 数据库配置 - 请根据实际情况修改
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'cms',
    'user': 'postgres',
    'password': 'your_password_here'
}

JSON_FILE = '/tmp/cms-migration/articles.json'


def load_articles(filepath):
    """加载 JSON 文件中的文章数据"""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def update_articles(articles):
    """批量更新文章正文"""
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()

    updated_count = 0
    not_found_count = 0
    error_count = 0

    for article in articles:
        article_id = article.get('id')
        body = article.get('body', '')

        if not article_id:
            print(f"⚠️  跳过缺少 ID 的文章")
            error_count += 1
            continue

        try:
            cursor.execute(
                "UPDATE articles SET body = %s WHERE id = %s",
                (body, article_id)
            )
            if cursor.rowcount > 0:
                updated_count += 1
                print(f"✅ 更新文章 ID={article_id}")
            else:
                not_found_count += 1
                print(f"❌ 未找到文章 ID={article_id}")
        except Exception as e:
            error_count += 1
            print(f"❌ 更新文章 ID={article_id} 失败: {e}")

    conn.commit()
    cursor.close()
    conn.close()

    return updated_count, not_found_count, error_count


def main():
    print(f"📂 开始迁移文章数据...")
    print(f"📄 读取文件: {JSON_FILE}")

    try:
        articles = load_articles(JSON_FILE)
    except FileNotFoundError:
        print(f"❌ 文件不存在: {JSON_FILE}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"❌ JSON 解析失败: {e}")
        sys.exit(1)

    print(f"📊 共 {len(articles)} 篇文章待更新\n")

    updated, not_found, errors = update_articles(articles)

    print(f"\n{'='*50}")
    print(f"📈 迁移完成:")
    print(f"   ✅ 成功更新: {updated}")
    print(f"   ❌ 未找到:   {not_found}")
    print(f"   ⚠️  错误:     {errors}")
    print(f"{'='*50}")


if __name__ == '__main__':
    main()