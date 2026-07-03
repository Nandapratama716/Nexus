import json
import logging
import os
import time
import redis

# Konfigurasi Redis
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = os.getenv("REDIS_PORT", "6379")

r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

STREAM_KEY = "nexus:menu_stream"
GROUP_NAME = "ai_service_group"
CONSUMER_NAME = "ai_consumer_1"

def init_redis_group():
    try:
        r.xgroup_create(STREAM_KEY, GROUP_NAME, id="0", mkstream=True)
        logging.info(f"Redis Consumer Group '{GROUP_NAME}' created.")
    except redis.exceptions.ResponseError as e:
        if "BUSYGROUP" in str(e):
            logging.info(f"Consumer Group '{GROUP_NAME}' already exists.")
        else:
            logging.error(f"Error creating group: {e}")

def listen_for_menu_updates():
    """Berjalan di background thread untuk sinkronisasi data menu secara realtime"""
    logging.info("Listening for menu updates via Redis Streams...")
    init_redis_group()

    while True:
        try:
            # Block selama 5 detik jika tidak ada pesan
            messages = r.xreadgroup(GROUP_NAME, CONSUMER_NAME, {STREAM_KEY: ">"}, count=1, block=5000)
            
            if messages:
                for stream_name, stream_messages in messages:
                    for message_id, data in stream_messages:
                        # Parsing data dari Core Service (Go)
                        menu_id = data.get("menu_id")
                        action = data.get("action")
                        payload = data.get("payload")
                        
                        logging.info(f"Received {action} for Menu ID {menu_id}: {payload}")
                        
                        # TODO: Update data di ChromaDB (Vector DB) untuk pencarian menu
                        
                        # Acknowledge pesan agar tidak dibaca ulang
                        r.xack(STREAM_KEY, GROUP_NAME, message_id)
        except Exception as e:
            logging.error(f"Error reading stream: {e}")
            time.sleep(5)
