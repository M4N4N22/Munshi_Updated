# """
# main.py
# FastAPI Backend

# Run:
# uvicorn main:app --reload
# """

# from contextlib import asynccontextmanager
# from typing import Optional, Union

# import uvicorn
# from fastapi import FastAPI, Query
# from pydantic import BaseModel

# from bot_engine import (
#     IntentClassifier,
#     CommandParser,
# )

# # ============================================================
# # GLOBALS
# # ============================================================

# classifier = None

# command_parser = None

# # ============================================================
# # LIFESPAN
# # ============================================================


# @asynccontextmanager
# async def lifespan(app: FastAPI):

#     global classifier
#     global command_parser

#     print("⏳ Loading Hybrid Intent Classifier...")

#     classifier = IntentClassifier()

#     command_parser = CommandParser()

#     print("✅ API Ready")

#     yield

#     print("🛑 Shutdown")


# # ============================================================
# # FASTAPI
# # ============================================================

# app = FastAPI(
#     title="Worker Intent Classification API",
#     version="9.0.0",
#     lifespan=lifespan,
# )

# # ============================================================
# # RESPONSE MODEL
# # ============================================================


# class ClassifyResponse(BaseModel):

#     intent: str

#     id: Optional[Union[int, str]] = None

#     worker_slug: Optional[str] = None

#     depart_slug: Optional[str] = None

#     deadline: Optional[str] = None

#     message: Optional[str] = None

#     reject_reason: Optional[str] = None  # NEW: for mgrreject


# # ============================================================
# # ROOT
# # ============================================================


# @app.get("/")
# async def root():

#     return {
#         "service": "Hybrid Intent Classification API",
#         "version": "9.0.0",
#         "status": "running",
#     }


# # ============================================================
# # HEALTH
# # ============================================================


# @app.get("/health")
# async def health():

#     return {
#         "status": "ok",
#     }


# # ============================================================
# # CLASSIFICATION ENDPOINT
# # ============================================================


# @app.post(
#     "/classify",
#     response_model=ClassifyResponse,
# )
# async def classify(
#     message: str = Query(...)
# ):

#     # ========================================================
#     # COMMAND PARSER FIRST
#     # ========================================================

#     command_result = command_parser.parse(message)

#     if command_result:
#         return command_result

#     # ========================================================
#     # HYBRID CLASSIFIER
#     # ========================================================

#     result = classifier.classify(message)

#     return result


# # ============================================================
# # MAIN
# # ============================================================

# if __name__ == "__main__":

#     uvicorn.run(
#         "main:app",
#         host="0.0.0.0",
#         port=8000,
#         reload=True,
#     )




"""
main.py
FastAPI Backend

Run:
uvicorn main:app --reload
"""

from contextlib import asynccontextmanager
from typing import List, Optional, Union
import base64

import uvicorn
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field

from bot_engine import (
    IntentClassifier,
    CommandParser,
    WaMessageConverter,
)
from contracts.python.models import ClassifyResponse, ParseResponse
from parsers.base import ParserInput
from parsers.router import ParserRouter

# ============================================================
# GLOBALS
# ============================================================

classifier = None

command_parser = None

wa_converter = None

parser_router = None

# ============================================================
# LIFESPAN
# ============================================================


@asynccontextmanager
async def lifespan(app: FastAPI):

    global classifier
    global command_parser
    global wa_converter
    global parser_router

    print("Loading Hybrid Intent Classifier...")

    classifier = IntentClassifier()

    command_parser = CommandParser()

    wa_converter = WaMessageConverter()

    parser_router = ParserRouter()

    print("API Ready")

    yield

    print("Shutdown")


# ============================================================
# FASTAPI
# ============================================================

app = FastAPI(
    title="Munshi LLM Service",
    version="10.0.0",
    lifespan=lifespan,
)

# ============================================================
# RESPONSE MODELS
# ============================================================


class ConvertResponse(BaseModel):

    message: str


class ParseRequest(BaseModel):
    factory_id: int
    file_name: str
    mime_type: str = "application/octet-stream"
    document_type: Optional[str] = None
    content_base64: str = Field(..., min_length=1)


# ============================================================
# ROOT
# ============================================================


@app.get("/")
async def root():

    return {
        "service": "Munshi LLM Service",
        "version": "10.0.0",
        "status": "running",
    }


# ============================================================
# HEALTH
# ============================================================


@app.get("/health")
async def health():

    return {
        "status": "ok",
    }


# ============================================================
# CLASSIFICATION ENDPOINT
# ============================================================


@app.post(
    "/classify",
    response_model=ClassifyResponse,
)
async def classify(
    message: str = Query(...)
):

    # ========================================================
    # COMMAND PARSER FIRST
    # ========================================================

    command_result = command_parser.parse(message)

    if command_result:
        return command_result

    # ========================================================
    # HYBRID CLASSIFIER
    # ========================================================

    result = classifier.classify(message)

    return result


# ============================================================
# WA MESSAGE CONVERTER ENDPOINT
# Accepts a WhatsApp-formatted message and returns plain English.
# ============================================================


@app.post(
    "/convert",
    response_model=ConvertResponse,
)
async def convert_wa_message(
    message: str = Query(..., description="WhatsApp-formatted message to convert to plain English")
):
    plain = wa_converter.convert(message)
    return {"message": plain}


@app.post("/parse", response_model=ParseResponse)
async def parse_document(body: ParseRequest):
    try:
        content = base64.b64decode(body.content_base64)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid base64 content: {exc}") from exc

    try:
        result = parser_router.parse(
            ParserInput(
                factory_id=body.factory_id,
                file_name=body.file_name,
                mime_type=body.mime_type,
                content=content,
                document_type=body.document_type,
            )
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return ParseResponse(
        document_type=result.document_type,
        payload=result.payload,
        warnings=result.warnings or None,
    )


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )