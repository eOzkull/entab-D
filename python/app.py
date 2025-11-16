from flask import Flask, request, jsonify
import json
import os

app = Flask(__name__)

# File to store rules persistently
RULES_FILE = 'rules_backup.json'

def load_rules():
    if os.path.exists(RULES_FILE):
        try:
            with open(RULES_FILE, 'r') as f:
                return json.load(f)
        except:
            return []
    return []

def save_rules(rules):
    with open(RULES_FILE, 'w') as f:
        json.dump(rules, f, indent=2)

@app.route("/rules", methods=["GET"])
def get_rules():
    rules = load_rules()
    return jsonify({"rules": rules})

@app.route("/rules", methods=["POST"])
def set_rules():
    data = request.get_json(silent=True) or {}
    rules = data.get("rules", [])
    save_rules(rules)
    return jsonify({"ok": True, "count": len(rules), "message": "Rules saved successfully"})

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"ok": True, "message": "Tab Tamer Python Backend is running"})

@app.route("/stats", methods=["GET"])
def get_stats():
    rules = load_rules()
    total_rules = len(rules)
    total_keywords = sum(len(rule.get('keywords', [])) for rule in rules)
    return jsonify({
        "total_rules": total_rules,
        "total_keywords": total_keywords,
        "rules": rules
    })

if __name__ == "__main__":
    print("Starting Tab Tamer Python Backend...")
    print("API available at: http://127.0.0.1:5055")
    print("Endpoints:")
    print("  GET  /rules     - Get saved rules")
    print("  POST /rules     - Save rules")
    print("  GET  /health    - Health check")
    print("  GET  /stats     - Get rules statistics")
    app.run(host="127.0.0.1", port=5055, debug=False)
