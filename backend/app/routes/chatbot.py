from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.chatbot_service import ask_ai, search_products
from app.rag.chain import get_retriever, get_llm, PROMPT, format_documents


router = APIRouter(
    prefix="/chatbot",
    tags=["ChatBot"],
)


class ChatRequest(BaseModel):
    message: str


@router.post("")
def chatbot(
    request: ChatRequest,
    db: Session = Depends(get_db),
):
    products = search_products(db, request.message)

    reply = ask_ai(request.message, products)

    return {
        "reply": reply
    }


@router.post("/stream")
async def chatbot_stream(request: ChatRequest):

    async def generate():
        retriever = get_retriever(k=5)

        documents = await retriever.ainvoke(
            request.message
        )

        if not documents:
            yield "I couldn't find any products matching your question."
            return

        context = format_documents(documents)

        llm = get_llm()

        messages = PROMPT.format_messages(
            context=context,
            question=request.message,
        )

        async for chunk in llm.astream(messages):
            if chunk.content:
                yield chunk.content

    return StreamingResponse(
        generate(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )