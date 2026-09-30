from typing import Annotated, List

from pydantic import BaseModel, ConfigDict, Field, model_validator


MODEL_FEATURES = (
    "Age",
    "Sex",
    "RestingBP",
    "Cholesterol",
    "FastingBS",
    "MaxHR",
    "ExerciseAngina",
    "Oldpeak",
    "ChestPainType_ATA",
    "ChestPainType_NAP",
    "ChestPainType_TA",
    "ST_Slope_Flat",
    "ST_Slope_Up",
)

BinaryValue = Annotated[int, Field(strict=True, ge=0, le=1)]
NumericValue = Annotated[float, Field(strict=True, allow_inf_nan=False)]


class PredictionInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    Age: NumericValue
    Sex: BinaryValue
    RestingBP: NumericValue
    Cholesterol: NumericValue
    FastingBS: BinaryValue
    MaxHR: NumericValue
    ExerciseAngina: BinaryValue
    Oldpeak: NumericValue
    ChestPainType_ATA: BinaryValue
    ChestPainType_NAP: BinaryValue
    ChestPainType_TA: BinaryValue
    ST_Slope_Flat: BinaryValue
    ST_Slope_Up: BinaryValue

    @model_validator(mode="after")
    def validate_one_hot_groups(self):
        if sum((self.ChestPainType_ATA, self.ChestPainType_NAP, self.ChestPainType_TA)) > 1:
            raise ValueError("At most one ChestPainType field can be 1")
        if self.ST_Slope_Flat + self.ST_Slope_Up > 1:
            raise ValueError("At most one ST_Slope field can be 1")
        return self


class FeatureExplanation(BaseModel):
    feature: str
    label: str
    contribution: float
    direction: str  # "increases_risk" or "decreases_risk"


class PredictionOutput(BaseModel):
    prediction: int
    probabilities: dict[str, float] | None = None
    model_version: str | None = None
    feature_explanations_supported: bool = True
    feature_contributions: List[FeatureExplanation] | None = None