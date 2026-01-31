import asyncio
import base64
import hashlib
import random
from typing import List

from ...models import Identifiers, ItemIdentity


MOCK_ITEMS: List[ItemIdentity] = [
    ItemIdentity(
        item_type="vintage wristwatch",
        brand="Rolex",
        model="Submariner",
        visual_condition="used_excellent",
        condition_details="Minor hairline scratches on bracelet; dial appears clean.",
        estimated_age="1990s",
        category_hint="Wristwatches",
        search_keywords=["Rolex Submariner", "Rolex Submariner stainless", "Submariner automatic"],
        identifiers=Identifiers(UPC=None, model_number="Submariner", serial_number=None),
        description="Vintage Rolex Submariner automatic wristwatch in excellent used condition with minor bracelet scratches. Classic stainless steel dive watch from the 1990s.",
        ai_identification_confidence="HIGH",
    ),
    ItemIdentity(
        item_type="wireless headphones",
        brand="Sony",
        model="WH-1000XM4",
        visual_condition="used_good",
        condition_details="Light scuffs on earcups; headband padding intact.",
        estimated_age="2020s",
        category_hint="Headphones",
        search_keywords=["Sony WH-1000XM4", "WH1000XM4 noise cancelling", "Sony over ear"],
        identifiers=Identifiers(UPC=None, model_number="WH-1000XM4", serial_number=None),
        description="Sony WH-1000XM4 wireless noise-cancelling over-ear headphones in good used condition. Light cosmetic wear on earcups, headband padding fully intact.",
        ai_identification_confidence="HIGH",
    ),
    ItemIdentity(
        item_type="hardcover novel",
        brand="unknown",
        model="unknown",
        visual_condition="used_fair",
        condition_details="Corner wear on dust jacket; light spine creasing.",
        estimated_age="unknown",
        category_hint="Books",
        search_keywords=["hardcover novel", "first edition hardcover", "dust jacket"],
        identifiers=Identifiers(UPC=None, model_number=None, serial_number=None),
        description="Hardcover novel with dust jacket in fair used condition. Shows corner wear and light spine creasing from reading.",
        ai_identification_confidence="LOW",
    ),
    ItemIdentity(
        item_type="office chair",
        brand="Herman Miller",
        model="Aeron",
        visual_condition="used_good",
        condition_details="Normal wear on armrests; mesh looks intact.",
        estimated_age="unknown",
        category_hint="Office Furniture",
        search_keywords=["Herman Miller Aeron", "Aeron chair", "Herman Miller office chair"],
        identifiers=Identifiers(UPC=None, model_number="Aeron", serial_number=None),
        description="Herman Miller Aeron ergonomic office chair in good used condition. Mesh seat and back appear intact, normal wear on armrests.",
        ai_identification_confidence="HIGH",
    ),
    # Edge case: Unknown/ambiguous item (LOW confidence)
    ItemIdentity(
        item_type="decorative object",
        brand="unknown",
        model="unknown",
        visual_condition="used_good",
        condition_details="Unable to determine specific details; appears to be a decorative item.",
        estimated_age="unknown",
        category_hint="Collectibles",
        search_keywords=["decorative object", "collectible", "home decor"],
        identifiers=Identifiers(UPC=None, model_number=None, serial_number=None),
        description="Decorative object of unknown origin in good condition. Unable to identify specific brand or model.",
        ai_identification_confidence="LOW",
    ),
]


def _select_item(base64_image: str) -> ItemIdentity:
    try:
        decoded = base64.b64decode(base64_image, validate=True)
    except Exception as e:
        raise ValueError("Invalid base64 image") from e

    image_hash = hashlib.sha256(decoded).hexdigest()
    item_index = int(image_hash[:8], 16) % len(MOCK_ITEMS)
    return MOCK_ITEMS[item_index]


async def identify_item_from_image(base64_image: str) -> ItemIdentity:
    """Deterministic mock AI interpreter with realistic latency."""
    await asyncio.sleep(random.uniform(0.5, 1.5))
    return _select_item(base64_image)
