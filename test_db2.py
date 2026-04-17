import psycopg
import sys

conn_info = "host=aws-1-ap-southeast-1.pooler.supabase.com port=6543 dbname=postgres user=postgres.bjlmndmafrajjysenpbm password=EatFit@2026Admin sslmode=require"
try:
    with psycopg.connect(conn_info) as conn:
        print("Connection 6543 successful")
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
            print("Query successful:", cur.fetchone())
except Exception as e:
    print(f"Connection 6543 failed: {e}")
