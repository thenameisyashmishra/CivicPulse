"""
Sustainability & Environmental Compliance Service (Pillar B.11 - 4 Features).
"""

from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.models import (
    utcnow,
    Project,
    CarbonFootprintRecord,
    CompensatoryPlantationTracker,
    WasteDisposalLog,
    ClimateRiskTag,
)


class SustainabilityService:

    # 1. Green Infrastructure / Carbon-Footprint Tracking
    @staticmethod
    def calculate_carbon_footprint(
        db: Session, project_id: str, cement_mt: float, steel_mt: float, bitumen_mt: float
    ) -> CarbonFootprintRecord:
        # Standard embodied carbon emission factors (tCO2e / MT):
        # OPC Cement: ~0.85 tCO2e/MT, TMT Steel: ~1.82 tCO2e/MT, Bitumen: ~0.45 tCO2e/MT
        embodied_co2 = round((cement_mt * 0.85) + (steel_mt * 1.82) + (bitumen_mt * 0.45), 2)
        grade = "GRIHA_5_STAR" if embodied_co2 < 500 else ("GRIHA_4_STAR" if embodied_co2 < 1500 else "GRIHA_3_STAR")

        rec = CarbonFootprintRecord(
            project_id=project_id,
            cement_consumption_mt=cement_mt,
            steel_consumption_mt=steel_mt,
            bitumen_consumption_mt=bitumen_mt,
            embodied_carbon_tco2e=embodied_co2,
            green_rating_grade=grade,
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)
        return rec

    # 2. Tree Clearance & Compensatory Plantation Tracker (1:10 Ratio)
    @staticmethod
    def track_compensatory_plantation(
        db: Session, project_id: str, felled: int, planted: int, survival_pct: float, wkt: str
    ) -> CompensatoryPlantationTracker:
        mandatory = felled * 10
        rec = CompensatoryPlantationTracker(
            project_id=project_id,
            trees_felled_count=felled,
            mandatory_plantation_count=mandatory,
            actual_planted_count=planted,
            satellite_verified_survival_rate_pct=survival_pct,
            plantation_geofence_wkt=wkt,
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)
        return rec

    # 3. Waste & Debris Disposal Compliance Logging
    @staticmethod
    def log_waste_disposal(
        db: Session, project_id: str, tons: float, facility: str, manifest_id: str
    ) -> WasteDisposalLog:
        rec = WasteDisposalLog(
            project_id=project_id,
            waste_quantity_metric_tons=tons,
            authorized_recycling_facility=facility,
            transport_manifest_receipt_id=manifest_id,
            municipal_clearance_status="cleared",
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)
        return rec

    # 4. Climate-Resilience Risk Tagging
    @staticmethod
    def tag_climate_risk(
        db: Session, project_id: str, hazard_type: str, vuln_score: float, mitigations: str
    ) -> ClimateRiskTag:
        rec = ClimateRiskTag(
            project_id=project_id,
            hazard_zone_type=hazard_type,
            vulnerability_score=vuln_score,
            climate_resilience_design_mitigations=mitigations,
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)
        return rec
