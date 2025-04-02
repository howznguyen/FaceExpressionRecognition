import os
from dotenv import load_dotenv
from fastapi.staticfiles import StaticFiles

from routes import face_expression

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config.common import settings

app = FastAPI(title="Face Emotion Recognition API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(face_expression.router)

app.mount("/static", StaticFiles(directory="static"), name="static")
