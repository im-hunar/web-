# Heart Failure Detection ML API

This service uses the existing `model/heart_disease_model.pkl` artifact. It does not train or modify the model.

The artifact is a scikit-learn `GradientBoostingClassifier` serialized with joblib/pickle. Its fitted input order is:

`Age`, `Sex`, `RestingBP`, `Cholesterol`, `FastingBS`, `MaxHR`, `ExerciseAngina`, `Oldpeak`, `ChestPainType_ATA`, `ChestPainType_NAP`, `ChestPainType_TA`, `ST_Slope_Flat`, `ST_Slope_Up`.

It has no embedded preprocessing pipeline and no separate scaler or encoder artifact was supplied. Inputs must therefore already be numeric and one-hot encoded in this schema; the API does not infer or create omitted features. The classifier outputs classes `0` and `1` and supports `predict_proba`. The model artifact does not include an authoritative version identifier; `model_version` is returned only when `MODEL_VERSION` is explicitly configured.

## Run

From this directory, create a virtual environment, install the requirements, and start the API:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
py -m pip install -r requirements.txt
Copy-Item .env.example .env
py -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## Test request

In another PowerShell window, submit the included model-ready sample to the running API:

```powershell
curl.exe -X POST http://127.0.0.1:8000/predict -H "Content-Type: application/json" --data-binary "@sample_request.json"
```

`POST /predict` rejects missing, extra, non-finite, non-numeric, out-of-range binary, and conflicting one-hot fields with HTTP 422. `GET /health` reports whether the model loaded. Keep the pickle artifact trusted: loading joblib/pickle files can execute code.