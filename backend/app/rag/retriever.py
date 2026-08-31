from langchain_core.retrievers import BaseRetriever

from app.rag.vectorstore import get_vectorstore


def get_retriever(
    k: int = 5,
) -> BaseRetriever:
    """
    Create a retriever for the E-Shop product vector store.
    """

    vectorstore = get_vectorstore()

    return vectorstore.as_retriever(
        search_type="similarity",
        search_kwargs={
            "k": k,
        },
    )