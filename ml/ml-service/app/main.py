from contextlib import asynccontextmanager
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request

from app.model_runtime import load_model, predict
from app.schema import PredictionInput, PredictionOutput


load_dotenv()
MODEL_VERSION = os.getenv("MODEL_VERSION") or None


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.model = load_model()
    yield


app = FastAPI(title="Heart Failure Detection API", lifespan=lifespan)


@app.get("/health")
def health(request: Request):
    return {"status": "ok", "model_loaded": hasattr(request.app.state, "model")}


@app.post("/predict", response_model=PredictionOutput, response_model_exclude_none=True)
def create_prediction(payload: PredictionInput, request: Request):
    try:
        prediction, probabilities, feature_explanations_supported, feature_contributions = predict(
            request.app.state.model, payload
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Prediction failed") from exc

    return PredictionOutput(
        prediction=prediction,
        probabilities=probabilities,
        model_version=MODEL_VERSION,
        feature_explanations_supported=feature_explanations_supported,
        feature_contributions=feature_contributions,
    )