from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, Table
)
from sqlalchemy.orm import relationship
from app.database.session import Base

def utc_now():
    return datetime.now(timezone.utc)

# Association table for Case <-> Advertisement many-to-many
case_advertisements = Table(
    "case_advertisements",
    Base.metadata,
    Column("case_id", Integer, ForeignKey("cases.id", ondelete="CASCADE"), primary_key=True),
    Column("advertisement_id", Integer, ForeignKey("advertisements.id", ondelete="CASCADE"), primary_key=True),
)

class Advertisement(Base):
    __tablename__ = "advertisements"

    id = Column(Integer, primary_key=True, index=True)
    custom_id = Column(String(64), unique=True, index=True, nullable=True) # e.g. AD-DEMO-001 or AD-SCAN-XXXX
    original_text = Column(Text, nullable=False)
    normalized_text = Column(Text, nullable=False)
    source_type = Column(String(32), default="text") # text, url, screenshot, csv_batch
    submitted_url = Column(String(512), nullable=True)
    content_hash = Column(String(64), index=True, nullable=False) # SHA256 of normalized text
    created_at = Column(DateTime, default=utc_now)
    review_status = Column(String(32), default="NEW") # NEW, NEEDS_REVIEW, UNDER_INVESTIGATION, ESCALATED, CLOSED, FALSE_POSITIVE
    platform = Column(String(64), default="Unknown")
    is_demo = Column(Boolean, default=False, index=True) # DEMO vs LIVE scan provenance
    data_source = Column(String(32), default="LIVE_SCAN", index=True) # LIVE_SCAN, DATASET_IMPORT, SYNTHETIC_DEMO

    # Relationships
    analysis = relationship("AnalysisResult", back_populates="advertisement", uselist=False, cascade="all, delete-orphan")
    evidence_items = relationship("Evidence", back_populates="advertisement", cascade="all, delete-orphan")
    entities = relationship("ExtractedEntity", back_populates="advertisement", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="advertisement", cascade="all, delete-orphan")
    cases = relationship("Case", secondary=case_advertisements, back_populates="advertisements")

class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    advertisement_id = Column(Integer, ForeignKey("advertisements.id", ondelete="CASCADE"), unique=True)
    risk_score = Column(Float, nullable=False) # 0 to 100
    risk_level = Column(String(16), nullable=False) # LOW, MEDIUM, HIGH
    model_available = Column(Boolean, default=True)
    model_signal = Column(Float, nullable=True) # ML probability if present (0.0 to 1.0)
    model_score = Column(Float, nullable=True) # Model percentage score (0 to 100)
    model_version = Column(String(64), nullable=True) # e.g. fraudscope-tfidf-lr-v1.0
    model_class = Column(String(32), nullable=True) # safe or suspicious
    explanation = Column(Text, nullable=False)
    recommended_review_action = Column(String(128), nullable=False)
    created_at = Column(DateTime, default=utc_now)

    advertisement = relationship("Advertisement", back_populates="analysis")

class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(Integer, primary_key=True, index=True)
    advertisement_id = Column(Integer, ForeignKey("advertisements.id", ondelete="CASCADE"))
    analysis_result_id = Column(Integer, ForeignKey("analysis_results.id", ondelete="SET NULL"), nullable=True)
    evidence_type = Column(String(64), nullable=False) # RULE_MATCH, PHISHING_INDICATOR, UNCHECKED_ACCOUNT, etc.
    matched_text = Column(Text, nullable=False)
    description = Column(Text, nullable=False)
    source_location = Column(String(64), nullable=True) # e.g. "chars 12-45"
    created_at = Column(DateTime, default=utc_now)

    advertisement = relationship("Advertisement", back_populates="evidence_items")

class ExtractedEntity(Base):
    __tablename__ = "extracted_entities"

    id = Column(Integer, primary_key=True, index=True)
    advertisement_id = Column(Integer, ForeignKey("advertisements.id", ondelete="CASCADE"))
    entity_type = Column(String(32), nullable=False) # PHONE, TELEGRAM, WHATSAPP, URL_DOMAIN, CRYPTO, EMAIL, BANK_HANDLE
    entity_value = Column(String(256), nullable=False)
    normalized_value = Column(String(256), nullable=False, index=True)

    advertisement = relationship("Advertisement", back_populates="entities")

class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    case_ref = Column(String(64), unique=True, index=True, nullable=False) # CASE-2026-XXXX
    title = Column(String(256), nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(String(16), default="MEDIUM") # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String(32), default="OPEN") # OPEN, IN_PROGRESS, ESCALATED, CLOSED
    assigned_to = Column(String(128), default="Analyst Alpha")
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    advertisements = relationship("Advertisement", secondary=case_advertisements, back_populates="cases")
    notes = relationship("CaseNote", back_populates="case", cascade="all, delete-orphan", order_by="desc(CaseNote.created_at)")

class CaseNote(Base):
    __tablename__ = "case_notes"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"))
    note = Column(Text, nullable=False)
    actor = Column(String(128), default="Analyst")
    created_at = Column(DateTime, default=utc_now)

    case = relationship("Case", back_populates="notes")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    advertisement_id = Column(Integer, ForeignKey("advertisements.id", ondelete="SET NULL"), nullable=True)
    alert_type = Column(String(64), nullable=False) # HIGH_RISK_DETECTED, DUPLICATE_CLUSTER, CREDENTIAL_HARVESTING
    severity = Column(String(16), default="HIGH") # LOW, MEDIUM, HIGH, CRITICAL
    message = Column(Text, nullable=False)
    reviewed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)

    advertisement = relationship("Advertisement", back_populates="alerts")

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True)
    actor = Column(String(128), default="System")
    action = Column(String(64), nullable=False) # SCAN_AD, UPDATE_STATUS, CREATE_CASE, ADD_NOTE, REVIEW_ALERT
    entity_type = Column(String(64), nullable=False)
    entity_id = Column(String(64), nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(64), unique=True, nullable=False)
    value = Column(String(256), nullable=False)
    description = Column(String(256), nullable=True)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
