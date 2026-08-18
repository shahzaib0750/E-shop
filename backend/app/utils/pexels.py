import os
import requests
from dotenv import load_dotenv

load_dotenv()

PEXELS_API_KEY = os.getenv("PEXELS_API_KEY")

# via.placeholder.com is shut down; product.image is NOT NULL, so the
# fallback must always be a live, loadable URL.
FALLBACK_IMAGE = "https://placehold.co/400x400?text=No+Image"


def get_product_image(query):

    if not PEXELS_API_KEY:
        return FALLBACK_IMAGE

    url = "https://api.pexels.com/v1/search"

    headers = {
        "Authorization": PEXELS_API_KEY
    }

    params = {
        "query": query,
        "per_page": 1
    }

    try:
        response = requests.get(
            url,
            headers=headers,
            params=params,
            timeout=10,
        )

        response.raise_for_status()

        data = response.json()

        photos = data.get("photos") or []

        if photos:
            return photos[0]["src"]["large"]

    except (requests.RequestException, ValueError):
        # Network error, timeout, or malformed response — fall through
        # to the placeholder so seeding never crashes on one bad image.
        pass

    return FALLBACK_IMAGE