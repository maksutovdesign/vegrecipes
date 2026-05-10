"""Elasticsearch integration for full-text recipe search."""
from elasticsearch import AsyncElasticsearch
from config import settings

INDEX = "recipes"

es = AsyncElasticsearch(settings.ELASTICSEARCH_URL)


async def ensure_index():
    if not await es.indices.exists(index=INDEX):
        await es.indices.create(index=INDEX, body={
            "mappings": {
                "properties": {
                    "title": {"type": "text", "analyzer": "russian"},
                    "description": {"type": "text", "analyzer": "russian"},
                    "tags": {"type": "keyword"},
                    "cuisine_country": {"type": "keyword"},
                    "category": {"type": "keyword"},
                    "difficulty": {"type": "integer"},
                    "cook_time": {"type": "integer"},
                    "calories": {"type": "float"},
                    "rating": {"type": "float"},
                    "is_vegan": {"type": "boolean"},
                    "is_gluten_free": {"type": "boolean"},
                    "season_months": {"type": "integer"},
                }
            }
        })


async def index_recipe(recipe: dict):
    await es.index(index=INDEX, id=str(recipe["id"]), document={
        "title": recipe.get("title", ""),
        "description": recipe.get("description", ""),
        "tags": recipe.get("tags", []),
        "cuisine_country": recipe.get("cuisine_country", ""),
        "category": recipe.get("category", ""),
        "difficulty": recipe.get("difficulty", 1),
        "cook_time": recipe.get("cook_time", 0),
        "calories": recipe.get("calories", 0),
        "rating": recipe.get("rating", 0),
        "is_vegan": recipe.get("is_vegan", True),
        "is_gluten_free": recipe.get("is_gluten_free", False),
        "season_months": recipe.get("season_months", []),
    })


async def search_recipes(
    q: str = "",
    cuisine: str = None,
    category: str = None,
    difficulty: int = None,
    max_cook_time: int = None,
    max_calories: float = None,
    is_vegan: bool = None,
    is_gluten_free: bool = None,
    season_month: int = None,
    page: int = 1,
    size: int = 20,
) -> dict:
    must = []
    filters = []

    if q:
        must.append({"multi_match": {
            "query": q,
            "fields": ["title^3", "description", "tags"],
            "fuzziness": "AUTO",
        }})

    if cuisine:
        filters.append({"term": {"cuisine_country": cuisine}})
    if category:
        filters.append({"term": {"category": category}})
    if difficulty:
        filters.append({"term": {"difficulty": difficulty}})
    if max_cook_time:
        filters.append({"range": {"cook_time": {"lte": max_cook_time}}})
    if max_calories:
        filters.append({"range": {"calories": {"lte": max_calories}}})
    if is_vegan is not None:
        filters.append({"term": {"is_vegan": is_vegan}})
    if is_gluten_free is not None:
        filters.append({"term": {"is_gluten_free": is_gluten_free}})
    if season_month:
        filters.append({"term": {"season_months": season_month}})

    body = {
        "query": {"bool": {"must": must or [{"match_all": {}}], "filter": filters}},
        "sort": [{"rating": "desc"}, "_score"],
        "from": (page - 1) * size,
        "size": size,
    }

    result = await es.search(index=INDEX, body=body)
    hits = result["hits"]
    return {
        "total": hits["total"]["value"],
        "ids": [int(h["_id"]) for h in hits["hits"]],
        "page": page,
        "size": size,
    }


async def autocomplete(prefix: str, size: int = 8) -> list[str]:
    result = await es.search(index=INDEX, body={
        "query": {"match_phrase_prefix": {"title": {"query": prefix, "max_expansions": 20}}},
        "_source": ["title"],
        "size": size,
    })
    return [h["_source"]["title"] for h in result["hits"]["hits"]]


async def delete_recipe(recipe_id: int):
    try:
        await es.delete(index=INDEX, id=str(recipe_id))
    except Exception:
        pass
