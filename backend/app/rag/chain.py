from langchain_core.prompts import ChatPromptTemplate
from langchain_ollama import ChatOllama

from app.rag.retriever import get_retriever


def get_llm():
    """
    Return the local Ollama chat model.
    """

    return ChatOllama(
        model="qwen2.5:1.5b",
        base_url="http://localhost:11434",
        temperature=0.1,
    )


PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """
You are the E-Shop shopping assistant.

Your job is to answer customer questions using ONLY
the product information provided in the context.

IMPORTANT RULES:

1. Never invent a product.
2. Never invent a price.
3. Never invent stock information.
4. Never invent product features.
5. Use the exact product names from the context.
6. When the user asks for available products, list the
   products clearly.
7. When mentioning a product, include its price when
   the price is available.
8. Include stock when it is relevant.
9. If the requested information is not in the context,
   clearly say that you don't have that information.
10. Do not mention that you are using a vector database,
    embeddings, retrieval, or internal context.
11. Keep the response concise and useful for a shopper.

PRODUCT CONTEXT:

{context}
""",
        ),
        (
            "human",
            "Customer question: {question}",
        ),
    ]
)


def format_documents(documents) -> str:
    """
    Format retrieved product documents for the LLM.
    """

    formatted = []

    for document in documents:
        formatted.append(
            f"""
Product:
{document.page_content}

Product ID:
{document.metadata.get("product_id")}

"""
        )

    return "\n---\n".join(formatted)


def ask(question: str) -> str:
    """
    Run the complete RAG pipeline.

    Question
        ↓
    Retriever
        ↓
    ChromaDB
        ↓
    Product context
        ↓
    Qwen
        ↓
    Answer
    """

    retriever = get_retriever(k=5)

    documents = retriever.invoke(question)

    if not documents:
        return (
            "I couldn't find any products matching "
            "your question."
        )

    context = format_documents(documents)

    llm = get_llm()

    messages = PROMPT.format_messages(
        context=context,
        question=question,
    )

    response = llm.invoke(messages)

    return response.content.strip()