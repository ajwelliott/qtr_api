import requests
import json
import os

# --- CONFIG ---
EVENT_ID = '1947300'  # Replace as needed
OUTPUT_DIR = r'D:\Documents\Horse Racing\Data\PuntersTest'
OUTPUT_FILE = f'{OUTPUT_DIR}/ResultsPreview_{EVENT_ID}.json'

PUNTERS_API_URL = 'https://puntapi.com/racing'
HEADERS = {
    "accept": "*/*",
    "accept-language": "en-US,en;q=0.9",
    "authorization": "Bearer none",
    "content-type": "application/json",
    "origin": "https://www.punters.com.au",
    "referer": "https://www.punters.com.au/",
    "user-agent": "Mozilla/5.0"
}

# --- Fetch Event ---
def fetch_event(event_id):
    variables = {
        "brand": "punters",
        "brandEnum": "punters",
        "eventId": event_id
    }
    extensions = {
        "persistedQuery": {
            "version": 1,
            "sha256Hash": "1208f445f68dbd694b26c8d0e4d1cad7112e80f9e3bbc61d672de2610f261f94"
        }
    }
    params = {
        "operationName": "getEventById",
        "variables": json.dumps(variables),
        "extensions": json.dumps(extensions)
    }

    response = requests.get(PUNTERS_API_URL, headers=HEADERS, params=params)
    response.raise_for_status()
    return response.json().get("data", {}).get("event", {})

# --- Flatten Event + Results ---
def flatten_results(event):
    flat_results = []
    base_event = {
        "event_id": event.get("id"),
        "event_name": event.get("name"),
        "event_number": event.get("eventNumber"),
        "event_distance": event.get("distance"),
        "event_start_time": event.get("startTime"),
        "event_end_time": event.get("endTime"),
        "status": event.get("status"),
        "is_resulted": event.get("isResulted"),
        "result_state": event.get("resultState"),
        "winning_time": event.get("winningTime"),
        "track_condition_overall": event.get("trackCondition", {}).get("overall"),
        "track_condition_rating": event.get("trackCondition", {}).get("rating"),
        "meeting_id": event.get("meetingId")
    }

    # Flatten selections
    for sel in event.get("selections", []):
        result_row = base_event.copy()
        result_row.update({
            "selection_id": sel.get("id"),
            "competitor_number": sel.get("competitorNumber"),
            "selection_result": sel.get("selectionResult"),
            "official_margin": sel.get("officialMargin"),
            "official_time": sel.get("officialTime"),
            "starting_price": sel.get("startingPrice"),
            "runner_comments": sel.get("comments"),
            "competitor_id": sel.get("competitor", {}).get("id"),
            "competitor_name": sel.get("competitor", {}).get("name"),
            "small_image_url": sel.get("competitor", {}).get("smallImageUrl")
        })
        flat_results.append(result_row)

    # Flatten exotic dividends
    for exotic in event.get("exoticResult", []):
        flat_results.append({
            "event_id": event.get("id"),
            "meeting_id": event.get("meetingId"),
            "type": "exotic_dividend",
            "tote": exotic.get("tote"),
            "exotic_market": exotic.get("exoticMarket"),
            "exotic_results": exotic.get("results"),
            "exotic_amount": exotic.get("amount")
        })

    return flat_results

# --- Save to JSON ---
def save_to_file(data, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    print(f"✅ Results saved to: {path}")

# --- MAIN ---
if __name__ == "__main__":
    print(f"📡 Fetching event {EVENT_ID}...")
    event = fetch_event(EVENT_ID)

    if not event.get("isResulted"):
        print("⚠️ Event is not resulted. Skipping.")
    else:
        results = flatten_results(event)
        save_to_file(results, OUTPUT_FILE)
