from pathlib import Path

from langchain_chroma import Chroma

from app.rag.embeddings import get_embeddings


# backend/data/chroma
CHROMA_PATH = Path(__file__).resolve().parents[2] / "data" / "chroma"

# Name of the Chroma collection
COLLECTION_NAME = "eshop_products"


def get_vectorstore() -> Chroma:
    """
    Return the persistent Chroma vector store.

    The vector database is stored locally at:
        backend/data/chroma/
    """

    return Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=get_embeddings(),
        persist_directory=str(CHROMA_PATH),
    )


def add_documents(documents):
    """
    Add LangChain documents to ChromaDB.

    Each document should contain:
        - page_content
        - metadata
    """

    vectorstore = get_vectorstore()

    return vectorstore.add_documents(documents)


def search_documents(query: str, k: int = 4):
    """
    Search ChromaDB for documents similar to the query.
    """

    vectorstore = get_vectorstore()

    return vectorstore.similarity_search(
        query,
        k=k,
    )


def delete_documents(ids: list[str]):
    """
    Delete vectors from ChromaDB using their IDs.
    """

    vectorstore = get_vectorstore()

    vectorstore.delete(ids=ids)


def clear_vectorstore():
    """
    Delete all documents from the E-Shop Chroma collection.

    Use carefully — this removes the indexed RAG data,
    but does NOT delete your PostgreSQL products.
    """

    vectorstore = get_vectorstore()

    collection = vectorstore._collection

    existing = collection.get()

    if existing["ids"]:
        collection.delete(ids=existing["ids"])