import requests
import pyodbc
from datetime import datetime

# --- CONFIGURATION ---

API_URL = "http://10.0.0.201:3000/api/punters-meetings/insert"
START_OFFSET = -5
END_OFFSET = 3

SERVER = 'localhost\\qtserver'
DATABASE = 'qtracing'
TABLE = 'punters_meetings'
CONN_STR = f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={SERVER};DATABASE={DATABASE};Trusted_Connection=yes;'

# --- CALL API TO TRIGGER INSERT ---
def insert_meetings(start_offset, end_offset):
    try:
        print(f"📡 Calling API to insert meetings from today+{start_offset} to today+{end_offset}")
        response = requests.post(API_URL, json={
            "startOffset": start_offset,
            "endOffset": end_offset
        })
        response.raise_for_status()
        data = response.json()

        # Print debug info if available
        if "flattenedMeetings" in data:
            meetings = data["flattenedMeetings"]
            print(f"🔎 Showing first 2 of {len(meetings)} flattened meetings:\n")
            for i, m in enumerate(meetings[:2]):
                print(f"--- Meeting {i + 1} ---")
                for k, v in m.items():
                    print(f"{k}: {v}")
                print("\n")
        else:
            print("⚠️ No flattened meetings returned in API response.")

        print("✅ Insert complete!")
        print("📊 Result:", data.get("result", data))
    except requests.exceptions.RequestException as e:
        print("❌ API error:", e)

# --- MAIN ---
if __name__ == "__main__":
    insert_meetings(START_OFFSET, END_OFFSET)
