import requests
import json

# The 3 orphaned item IDs
item_ids = ["KZFS74b1dsRLw3qiCYwT", "7HZBxw3aKhNg2PShM8ov", "wGjbx8mgffO596u3RKLP"]

# Make the POST request
response = requests.post(
    "http://127.0.0.1:5000/api/temp-recovery/restore-orphaned-items",
    headers={"Content-Type": "application/json"},
    json={"item_ids": item_ids}
)

print(f"Status: {response.status_code}")
print(f"Response: {response.text}") 