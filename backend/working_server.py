"""
Working FastAPI server with interface integration
"""

from fastapi import FastAPI, HTTPException
import sys
import os
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add the root directory to Python path
root_dir = os.path.abspath('..')
sys.path.insert(0, root_dir)

# Import interface
try:
    from interface import get_facts_nat_lang
    logger.info("✅ Successfully imported full interface module")
    interface_type = "full"
except ImportError as e:
    logger.warning(f"Could not import full interface: {e}")
    try:
        from interface_simple import get_facts_nat_lang
        logger.info("✅ Successfully imported simplified interface module")
        interface_type = "simplified"
    except ImportError as e2:
        logger.error(f"Could not import any interface: {e2}")
        interface_type = "fallback"
        def get_facts_nat_lang():
            return ["Fallback: No interface available"]

# Create FastAPI app
app = FastAPI(title="Clinical Chatbot API", version="1.0.0")

@app.get("/")
async def root():
    return {
        "message": "Clinical Chatbot API is running",
        "interface_type": interface_type,
        "status": "healthy"
    }

@app.get("/api/facts")
async def get_facts():
    """Get theorem prover facts"""
    try:
        logger.info("Fetching facts...")
        facts = get_facts_nat_lang()
        logger.info(f"Retrieved {len(facts)} facts")
        
        return {
            "facts": facts,
            "interface_type": interface_type,
            "count": len(facts),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting facts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)