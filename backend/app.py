from flask import Flask, request, jsonify
from flask_cors import CORS
import downloader
import os

app = Flask(__name__)
CORS(app)

# Ensure downloads directory exists
DOWNLOAD_DIR = os.path.join(os.getcwd(), 'downloads')
if not os.path.exists(DOWNLOAD_DIR):
    os.makedirs(DOWNLOAD_DIR)

@app.route('/info', methods=['POST'])
def get_info():
    data = request.json
    url = data.get('url')
    if not url:
        return jsonify({"error": "No URL provided"}), 400
    
    info = downloader.get_video_info(url)
    if "error" in info:
        return jsonify(info), 400
        
    return jsonify(info)

@app.route('/download', methods=['POST'])
def download():
    data = request.json
    url = data.get('url')
    options = data.get('options', {})
    options['output_path'] = DOWNLOAD_DIR
    
    if not url:
        return jsonify({"error": "No URL provided"}), 400
        
    download_id = downloader.start_download(url, options)
    return jsonify({"download_id": download_id})

@app.route('/progress', methods=['GET'])
def progress():
    return jsonify(downloader.download_status)

if __name__ == '__main__':
    app.run(port=5000, debug=True)
