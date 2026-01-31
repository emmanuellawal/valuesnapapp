import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.config import allowed_origins, settings
from backend.models import AnalyzeRequest
from backend.services.ai import identify_item_from_image
from backend.services.ebay import search_sold_listings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ValueSnap Engine")

# CORS - Allow your Expo App to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins or ["*"],  # Allow all for dev, tighten for prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {
        "system": "ValueSnap V2",
        "status": "operational",
        "mode": "swiss_minimalist",
        "sandbox": settings.ebay_use_sandbox,
        "cors": allowed_origins or ["*"],
    }


@app.post("/api/appraise")
async def appraise_item(request: AnalyzeRequest):
    """
    Main appraisal endpoint.
    
    Flow:
    1. GPT analyzes image (Visual Detective) -> Item Identity
    2. eBay searches market (Value Engine) -> Price Statistics
    3. Combined response with identity + valuation
    """
    # Step 1: Visual Identification (GPT)
    try:
        identity = await identify_item_from_image(request.image_base64)
    except Exception as e:
        logger.error(f"AI identification failed: {e}")
        raise HTTPException(status_code=500, detail=f"Image analysis failed: {str(e)}")
    
    # Step 2: Market Valuation (eBay)
    # Construct search query from AI's optimized keywords
    if identity.search_keywords:
        search_query = " ".join(identity.search_keywords[:3])  # Top 3 keywords
    else:
        # Fallback: construct from brand + model
        search_query = f"{identity.brand} {identity.model}".strip()
    
    market_data = await search_sold_listings(search_query)
    
    # Step 3: Combine and Return
    return {
        "identity": identity.model_dump(),
        "valuation": market_data,
    }


@app.get("/health")
def health_check():
    """Health check endpoint for monitoring."""
    return {"status": "healthy"}

