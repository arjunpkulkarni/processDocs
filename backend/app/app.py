import os
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]}})

    db_url = os.getenv("DATABASE_URL")

    def get_db_connection():
        conn = psycopg2.connect(db_url)
        return conn

    @app.route('/health', methods=['POST'])
    def health_check():
        return "OK"

    @app.route('/upload', methods=['POST'])
    def upload_file():
        print("Received request at /upload endpoint")
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400
        if file:
            filename = file.filename
            
            # Create uploads directory if it doesn't exist
            uploads_dir = 'uploads'
            os.makedirs(uploads_dir, exist_ok=True)
            
            filepath = os.path.join(uploads_dir, filename)
            file.save(filepath)

            # Extraction
            extraction_url = "https://plankton-app-qajlk.ondigitalocean.app/extraction_api"
            with open(filepath, 'rb') as f:
                files = {'file': (filename, f, 'application/pdf')}
                headers = {'accept': 'application/json'}
                response = requests.post(extraction_url, headers=headers, files=files)
            
            if response.status_code != 200:
                print(f"Error from extraction API: {response.status_code} {response.text}")
                return jsonify({"error": "Extraction failed", "details": response.text}), response.status_code
            
            extracted_data = response.json()

            # Matching
            matching_url = "https://endeavor-interview-api-gzwki.ondigitalocean.app/match/batch"
            
            po_items = [item['Request Item'] for item in extracted_data]

            match_payload = {
                "queries": po_items,
            }
            
            match_response = requests.post(matching_url, json=match_payload)

            if match_response.status_code != 200:
                print(f"Error from matching API: {match_response.status_code} {match_response.text}")
                return jsonify({"error": "Matching failed", "details": match_response.text}), match_response.status_code

            matching_results = match_response.json()
            
            extracted_data_map = {item.get('Request Item') or item.get('po_item'): item for item in extracted_data}

            augmented_results = {}
            if 'results' in matching_results:
                for po_item, matches in matching_results['results'].items():
                    augmented_results[po_item] = {
                        "matches": matches,
                        "details": extracted_data_map.get(po_item)
                    }

            return jsonify({"results": augmented_results})

    @app.route('/confirm_matches', methods=['POST'])
    def confirm_matches():
        matches = request.json.get('matches', [])
        conn = get_db_connection()
        cur = conn.cursor()
        for match in matches:
            cur.execute(
                "INSERT INTO orders (po_item, catalog_item_id, catalog_item_description) VALUES (%s, %s, %s)",
                (match['po_item'], match['catalog_item_id'], match['catalog_item_description'])
            )
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": "Matches confirmed successfully"}), 200

    @app.route('/orders', methods=['GET'])
    def get_orders():
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id, po_item, catalog_item_id, catalog_item_description, created_at FROM orders ORDER BY created_at DESC")
        orders = cur.fetchall()
        cur.close()
        conn.close()
        
        orders_list = []
        for order in orders:
            orders_list.append({
                "id": order[0],
                "po_item": order[1],
                "catalog_item_id": order[2],
                "catalog_item_description": order[3],
                "created_at": order[4]
            })
            
        return jsonify(orders_list)

    return app 