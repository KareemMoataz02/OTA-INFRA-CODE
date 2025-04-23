import socket
import threading
from pymongo import MongoClient
import os
import requests

# Retrieve Cosmos DB connection settings from environment variables
COSMOSDB_URI = os.environ.get('COSMOSDB_URI')
COSMOSDB_DATABASE = os.environ.get('COSMOSDB_DATABASE')
COSMOSDB_COLLECTION = os.environ.get('COSMOSDB_COLLECTION')

# Setup MongoDB client and select the collection for HEX updates
client = MongoClient(COSMOSDB_URI)
db = client[COSMOSDB_DATABASE]
hex_updates_collection = db[COSMOSDB_COLLECTION]

HOST = '0.0.0.0'
PORT = 9000


def handle_client(conn, addr):
    print(f"Connected by {addr}")
    try:
        # Expect the client to send the filename of the requested HEX update.
        data = conn.recv(1024).decode().strip()
        if not data:
            return
        print(f"Received request for file: {data}")
        try:
            # Query the MongoDB collection for a document matching the filename
            doc = hex_updates_collection.find_one({"filename": data})
            if doc:
                file_url = doc.get("file_url")
                # Fetch the file content from Azure Blob Storage using its URL
                response = requests.get(file_url)
                if response.status_code == 200:
                    hex_data = response.text
                    conn.sendall(hex_data.encode())
                else:
                    conn.sendall(
                        f"Error retrieving file: HTTP {response.status_code}".encode())
            else:
                conn.sendall(f"File {data} not found.".encode())
        except Exception as e:
            conn.sendall(f"Database error: {e}".encode())
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()


def start_server():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind((HOST, PORT))
        s.listen()
        print(f"HMI Socket Server listening on {HOST}:{PORT}")
        while True:
            client_conn, client_addr = s.accept()
            threading.Thread(target=handle_client, args=(
                client_conn, client_addr)).start()


if __name__ == "__main__":
    start_server()
