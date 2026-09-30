from pathlib import Path
import joblib
import pandas as pd

from app.schema import MODEL_FEATURES, PredictionInput, FeatureExplanation


MODEL_PATH = Path(__file__).resolve().parents[1] / "model" / "heart_disease_model.pkl"

FEATURE_LABELS = {
    "Age": "Age",
    "Sex": "Sex / Gender",
    "RestingBP": "Resting Blood Pressure",
    "Cholesterol": "Serum Cholesterol",
    "FastingBS": "Fasting Blood Sugar",
    "MaxHR": "Maximum Heart Rate",
    "ExerciseAngina": "Exercise-Induced Angina",
    "Oldpeak": "ST Depression (Oldpeak)",
    "ChestPainType_ATA": "Chest Pain (Atypical Angina)",
    "ChestPainType_NAP": "Chest Pain (Non-Anginal)",
    "ChestPainType_TA": "Chest Pain (Typical Angina)",
    "ST_Slope_Flat": "ST Segment Slope (Flat)",
    "ST_Slope_Up": "ST Segment Slope (Upsloping)"
}


def load_model():
    if not MODEL_PATH.is_file():
        raise RuntimeError(f"Model artifact not found: {MODEL_PATH}")

    model = joblib.load(MODEL_PATH)
    actual_features = tuple(getattr(model, "feature_names_in_", ()))
    if actual_features != MODEL_FEATURES:
        raise RuntimeError("Model feature schema does not match the API input schema")
    if tuple(getattr(model, "classes_", ())) != (0, 1):
        raise RuntimeError("Model classes do not match the expected classes [0, 1]")
    if not callable(getattr(model, "predict", None)):
        raise RuntimeError("Model does not support prediction")

    return model


def predict(model, payload: PredictionInput):
    values = payload.model_dump()
    frame = pd.DataFrame([[values[name] for name in MODEL_FEATURES]], columns=MODEL_FEATURES)
    prediction = int(model.predict(frame)[0])

    probabilities = None
    if callable(getattr(model, "predict_proba", None)):
        scores = model.predict_proba(frame)[0]
        probabilities = {
            str(label): float(score)
            for label, score in zip(model.classes_, scores, strict=True)
        }

    # Calculate Explainable AI (XAI) feature contributions using SHAP / tree explainer
    feature_explanations_supported = True
    feature_contributions = []

    try:
        import shap
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(frame)
        
        # Extract 1D array of SHAP contributions
        if isinstance(shap_values, list):
            contributions_array = shap_values[1][0] if len(shap_values) > 1 else shap_values[0][0]
        else:
            contributions_array = shap_values[0]

        items = []
        for name, val in zip(MODEL_FEATURES, contributions_array):
            val_float = float(val)
            items.append({
                "feature": name,
                "label": FEATURE_LABELS.get(name, name),
                "contribution": round(abs(val_float), 4),
                "direction": "increases_risk" if val_float > 0 else "decreases_risk"
            })

        # Sort by highest absolute SHAP impact
        items.sort(key=lambda x: x["contribution"], reverse=True)
        
        feature_contributions = [
            FeatureExplanation(
                feature=item["feature"],
                label=item["label"],
                contribution=item["contribution"],
                direction=item["direction"]
            )
            for item in items
        ]
    except Exception:
        # Fallback to feature_importances_ if available
        if hasattr(model, "feature_importances_"):
            importances = model.feature_importances_
            items = []
            for name, imp in zip(MODEL_FEATURES, importances):
                items.append({
                    "feature": name,
                    "label": FEATURE_LABELS.get(name, name),
                    "contribution": round(float(imp), 4),
                    "direction": "increases_risk" if values[name] > 0 else "decreases_risk"
                })
            items.sort(key=lambda x: x["contribution"], reverse=True)
            feature_contributions = [
                FeatureExplanation(
                    feature=item["feature"],
                    label=item["label"],
                    contribution=item["contribution"],
                    direction=item["direction"]
                )
                for item in items
            ]
        else:
            feature_explanations_supported = False
            feature_contributions = None

    return prediction, probabilities, feature_explanations_supported, feature_contributions