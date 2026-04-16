import psycopg

# Direct connection uses postgres user, port 5432, and the direct supabase hostname
conn_info = "host=bjlmndmafrajjysenpbm.supabase.co port=5432 dbname=postgres user=postgres password=EatFit@2026Admin sslmode=require"
try:
    with psycopg.connect(conn_info) as conn:
        print("Direct Connection successful")
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
            print("Query successful:", cur.fetchone())
except Exception as e:
    print(f"Direct Connection failed: {e}")
