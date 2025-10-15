"""
Minimal test server to verify the interface module works
"""

from fastapi import FastAPI
import sys
import os

# Add the root directory to Python path
root_dir = os.path.join(os.path.dirname(__file__), '..')
sys.path.insert(0, root_dir)

# Try to import the interface
try:
    from interface import get_facts_nat_lang
    print("✅ Successfully imported full interface module")
    interface_type = "full"
except ImportError as e:
    print(f"❌ Could not import full interface: {e}")
    try:
        from interface_simple import get_facts_nat_lang
        print("✅ Successfully imported simplified interface module")
        interface_type = "simplified"
    except ImportError as e2:
        print(f"❌ Could not import simplified interface: {e2}")
        interface_type = "fallback"
        def get_facts_nat_lang():
            return ["Fallback data: No interface available"]

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Test server running", "interface": interface_type}

@app.get("/facts")
async def get_facts():
    try:
        facts = get_facts_nat_lang()
        return {
            "facts": facts,
            "interface_type": interface_type,
            "count": len(facts)
        }
    except Exception as e:
        return {"error": str(e), "interface_type": interface_type}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)