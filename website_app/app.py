from flask import Flask, request
import os
from pymongo import MongoClient
from azure.storage.blob import BlobServiceClient

app = Flask(__name__)

# Retrieve Cosmos DB connection settings from environment variables
# Expected environment variables include:
# COSMOSDB_URI - the MongoDB connection string for Cosmos DB
# COSMOSDB_DATABASE - the name of the database to use
# COSMOSDB_COLLECTION - the name of the collection for HexUpdates
COSMOSDB_URI = os.environ.get('COSMOSDB_URI')
COSMOSDB_DATABASE = os.environ.get('COSMOSDB_DATABASE')
COSMOSDB_COLLECTION = os.environ.get('COSMOSDB_COLLECTION')

mongo_client = MongoClient(COSMOSDB_URI)
mongo_db = mongo_client[COSMOSDB_DATABASE]
hex_updates_collection = mongo_db[COSMOSDB_COLLECTION]

# Retrieve Blob Storage settings from environment variables
# Expected variables: HEX_STORAGE_ACCOUNT_NAME, HEX_STORAGE_CONTAINER_NAME, HEX_STORAGE_ACCOUNT_KEY
BLOB_ACCOUNT_NAME = os.environ.get('HEX_STORAGE_ACCOUNT_NAME')
BLOB_CONTAINER_NAME = os.environ.get('HEX_STORAGE_CONTAINER_NAME')
BLOB_ACCOUNT_KEY = os.environ.get('HEX_STORAGE_ACCOUNT_KEY')
blob_connection_string = (
    f"DefaultEndpointsProtocol=https;AccountName={BLOB_ACCOUNT_NAME};"
    f"AccountKey={BLOB_ACCOUNT_KEY};EndpointSuffix=core.windows.net"
)

blob_service_client = BlobServiceClient.from_connection_string(
    blob_connection_string)
container_client = blob_service_client.get_container_client(
    BLOB_CONTAINER_NAME)


def get_uploads():
    """Retrieve all documents from the HexUpdates collection."""
    try:
        documents = list(hex_updates_collection.find())
        return documents
    except Exception as e:
        print("Error querying uploads:", e)
        return []


@app.route("/")
def index():
    uploads = get_uploads()

    table_html = "<h2>Uploaded Files</h2>"
    if uploads:
        table_html += """
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Filename</th>
              <th>File URL</th>
              <th>Car Model</th>
              <th>Patch Name</th>
              <th>Patch Version</th>
            </tr>
          </thead>
          <tbody>
        """
        for doc in uploads:
            doc_id = str(doc.get("_id"))
            filename = doc.get("filename", "")
            file_url = doc.get("file_url", "")
            car_model = doc.get("car_model", "")
            patch_name = doc.get("patch_name", "")
            patch_version = doc.get("patch_version", "")
            table_html += (
                f"<tr><td>{doc_id}</td><td>{filename}</td>"
                f"<td><a href='{file_url}' target='_blank'>View File</a></td>"
                f"<td>{car_model}</td><td>{patch_name}</td><td>{patch_version}</td></tr>"
            )
        table_html += """
          </tbody>
        </table>
        """
    else:
        table_html += "<p>No uploads found.</p>"

    html = f"""<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Upload Car HEX Update</title>
      <style>
        body {{
          font-family: Arial, sans-serif;
          background-color: #f2f2f2;
          margin: 0;
          padding: 20px;
        }}
        h1, h2 {{
          color: #333;
        }}
        form {{
          background-color: #fff;
          padding: 20px;
          border-radius: 5px;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          max-width: 500px;
          margin-bottom: 30px;
        }}
        input[type="file"],
        input[type="text"] {{
          width: 100%;
          padding: 10px;
          margin: 5px 0 10px 0;
          border: 1px solid #ccc;
          border-radius: 4px;
        }}
        input[type="submit"] {{
          background-color: red;
          color: white;
          padding: 10px 15px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }}
        input[type="submit"]:hover {{
          background-color: #45a049;
        }}
        table {{
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          background-color: #fff;
        }}
        table, th, td {{
          border: 1px solid #ddd;
        }}
        th, td {{
          padding: 8px;
          text-align: left;
        }}
        th {{
          background-color: #f2f2f2;
        }}
      </style>
    </head>
    <body>
      <h1>Upload Car HEX Update</h1>
      <form action="/upload" method="post" enctype="multipart/form-data">
        <input type="file" name="hex_file" /><br/><br/>
        <input type="text" name="car_model" placeholder="Car Model" /><br/><br/>
        <input type="text" name="patch_name" placeholder="Patch Name (e.g., BMW Link Patch 1)" /><br/><br/>
        <input type="text" name="patch_version" placeholder="Patch Version (e.g., 1.1)" /><br/><br/>
        <input type="submit" value="Upload" />
      </form>
      {table_html}
    </body>
    </html>
    """
    return html


@app.route("/upload", methods=["POST"])
def upload():
    file = request.files.get("hex_file")
    car_model = request.form.get("car_model")
    patch_name = request.form.get("patch_name")
    patch_version = request.form.get("patch_version")
    if not file:
        return "No file uploaded", 400

    filename = file.filename

    try:
        # Upload file to Azure Blob Storage
        blob_client = container_client.get_blob_client(filename)
        blob_client.upload_blob(file, overwrite=True)
        # Construct the blob file URL
        file_url = f"https://{BLOB_ACCOUNT_NAME}.blob.core.windows.net/{BLOB_CONTAINER_NAME}/{filename}"

        # Insert a new document into the MongoDB collection with patch information
        document = {
            "filename": filename,
            "file_url": file_url,
            "car_model": car_model,
            "patch_name": patch_name,
            "patch_version": patch_version
        }
        hex_updates_collection.insert_one(document)
    except Exception as e:
        return f"Error saving file: {e}", 500

    return f"File {filename} uploaded successfully! File URL: {file_url}"


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=80)
