"""
AI/ML Platform Engineering & Model Governance Service (Pillar B.12 - 6 Features).
"""

from datetime import datetime, timezone
import hashlib
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.models import (
    utcnow,
    Evidence,
    User,
    ModelRegistryRecord,
    ModelDriftMetric,
    HumanFeedbackRetrainingSample,
    FairnessAuditReport,
    ModelCardDocumentation,
    EdgeInferenceManifest,
)


class ModelGovernanceService:

    # 1. Model Registry & Versioning for All CV/Vision Models
    @staticmethod
    def register_model_version(
        db: Session, name: str, version: str, framework: str, storage_uri: str, stage: str = "production"
    ) -> ModelRegistryRecord:
        rec = db.execute(
            select(ModelRegistryRecord).where(ModelRegistryRecord.model_version == version)
        ).scalars().first()

        if not rec:
            sha = hashlib.sha256(f"{name}:{version}:{storage_uri}".encode("utf-8")).hexdigest()
            rec = ModelRegistryRecord(
                model_name=name,
                model_version=version,
                framework=framework,
                weights_sha256=sha,
                storage_uri=storage_uri,
                deployment_stage=stage,
            )
            db.add(rec)
            db.commit()
            db.refresh(rec)
        return rec

    # 2. Continuous Model Evaluation & Drift Monitoring
    @staticmethod
    def record_model_drift(
        db: Session, version: str, n_samples: int, prec: float, rec_score: float, map50: float
    ) -> ModelDriftMetric:
        # Drift alert triggers if mAP drops below 0.70
        alert = map50 < 0.70
        rec = ModelDriftMetric(
            model_version=version,
            evaluation_date=datetime.now().strftime("%Y-%m-%d"),
            test_sample_size=n_samples,
            precision_score=prec,
            recall_score=rec_score,
            map50_score=map50,
            drift_alert_triggered=alert,
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)
        return rec

    # 3. Human Feedback Loop for Model Retraining
    @staticmethod
    def submit_human_feedback(
        db: Session, evidence_id: int, ai_pred: dict, ground_truth: dict, engineer_id: int
    ) -> HumanFeedbackRetrainingSample:
        rec = HumanFeedbackRetrainingSample(
            evidence_id=evidence_id,
            original_ai_prediction_json=ai_pred,
            engineer_ground_truth_json=ground_truth,
            reviewing_engineer_id=engineer_id,
            is_queued_for_retraining=True,
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)
        return rec

    # 4. Bias & Fairness Audit Across Regions
    @staticmethod
    def audit_model_fairness(
        db: Session, name: str, n_districts: int, max_disparity_pct: float, disparate_impact: float
    ) -> FairnessAuditReport:
        certified = max_disparity_pct <= 5.0 and 0.80 <= disparate_impact <= 1.25
        rec = FairnessAuditReport(
            audit_date=datetime.now().strftime("%Y-%m-%d"),
            model_name=name,
            evaluated_districts_count=n_districts,
            max_regional_accuracy_disparity_pct=max_disparity_pct,
            disparate_impact_ratio=disparate_impact,
            is_fairness_certified=certified,
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)
        return rec

    # 5. Model Card & Documentation per Deployed Model
    @staticmethod
    def get_or_create_model_card(
        db: Session, name: str, domain: str, training_data: str, metrics: str, limits: str
    ) -> ModelCardDocumentation:
        card = db.execute(
            select(ModelCardDocumentation).where(ModelCardDocumentation.model_name == name)
        ).scalars().first()

        if not card:
            card = ModelCardDocumentation(
                model_name=name,
                intended_domain=domain,
                training_data_summary=training_data,
                quantitative_metrics_summary=metrics,
                ethical_and_operational_limits=limits,
                license="Apache-2.0 / GoI Open Data",
            )
            db.add(card)
            db.commit()
            db.refresh(card)
        return card

    # 6. Offline / Edge Inference Mode for Low-Connectivity Sites
    @staticmethod
    def get_edge_manifest(db: Session, model_code: str = "EDGE-YOLO-INT8-V1") -> EdgeInferenceManifest:
        rec = db.execute(
            select(EdgeInferenceManifest).where(EdgeInferenceManifest.model_code == model_code)
        ).scalars().first()

        if not rec:
            rec = EdgeInferenceManifest(
                model_code=model_code,
                quantization_type="INT8",
                package_size_mb=12.4,
                tflite_uri="/models/edge/yolov8_int8_quantized.tflite",
                offline_sync_protocol_version="SYNC-v2.2",
            )
            db.add(rec)
            db.commit()
            db.refresh(rec)
        return rec
