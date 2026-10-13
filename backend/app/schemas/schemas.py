from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

class EntitySchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    entity_type: str
    entity_value: str
    normalized_value: str

class EvidenceSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: Optional[int] = None
    evidence_type: str
    matched_text: str
    description: str
    source_location: Optional[str] = None
    created_at: Optional[datetime] = None

class TriggeredRuleSchema(BaseModel):
    rule_id: str
    rule_name: str
    category: str
    weight: int
    matched_phrases: List[str]
    explanation: str

class AnalysisResultSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: Optional[int] = None
    risk_score: float
    risk_level: str
    model_available: bool
    model_signal: Optional[float] = None
    explanation: str
    recommended_review_action: str
    triggered_rules: List[TriggeredRuleSchema] = []
    suspicious_phrases: List[str] = []
    is_duplicate: bool = False
    duplicate_of_id: Optional[str] = None
    near_duplicate_matches: List[Dict[str, Any]] = []

class AdAnalyzeRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=15000, description="Advertisement text or OCR extracted text")
    source_type: str = Field(default="text", description="text, url, screenshot, csv_batch")
    submitted_url: Optional[str] = Field(default=None, description="Optional URL string for safe static evaluation")

class AdSummarySchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    custom_id: Optional[str]
    original_text: str
    source_type: str
    submitted_url: Optional[str]
    risk_score: Optional[float]
    risk_level: Optional[str]
    review_status: str
    created_at: datetime
    entities_count: int = 0
    cases_count: int = 0

class AdDetailSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    custom_id: Optional[str]
    original_text: str
    normalized_text: str
    source_type: str
    submitted_url: Optional[str]
    content_hash: str
    review_status: str
    created_at: datetime
    analysis: Optional[AnalysisResultSchema]
    evidence_items: List[EvidenceSchema] = []
    entities: List[EntitySchema] = []
    related_ads: List[Dict[str, Any]] = []
    cases: List[Dict[str, Any]] = []

class AdStatusUpdateRequest(BaseModel):
    review_status: str # NEW, NEEDS_REVIEW, UNDER_INVESTIGATION, ESCALATED, CLOSED, FALSE_POSITIVE
    notes: Optional[str] = None
    actor: Optional[str] = "Analyst"

class CaseNoteSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    case_id: int
    note: str
    actor: str
    created_at: datetime

class CaseNoteCreateSchema(BaseModel):
    note: str = Field(..., min_length=1, max_length=5000)
    actor: str = Field(default="Analyst Alpha")

class CaseCreateSchema(BaseModel):
    title: str = Field(..., min_length=3, max_length=256)
    description: Optional[str] = None
    priority: str = Field(default="MEDIUM", description="LOW, MEDIUM, HIGH, CRITICAL")
    ad_ids: List[int] = Field(default_factory=list, description="IDs of advertisements to associate")
    assigned_to: Optional[str] = "Analyst Alpha"

class CaseUpdateSchema(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None # OPEN, IN_PROGRESS, ESCALATED, CLOSED
    assigned_to: Optional[str] = None
    add_ad_ids: Optional[List[int]] = None

class CaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    case_ref: str
    title: str
    description: Optional[str]
    priority: str
    status: str
    assigned_to: str
    created_at: datetime
    updated_at: datetime
    advertisements_count: int = 0
    advertisements: List[AdSummarySchema] = []
    notes: List[CaseNoteSchema] = []

class AlertSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    advertisement_id: Optional[int]
    custom_id: Optional[str] = None
    alert_type: str
    severity: str
    message: str
    reviewed: bool
    created_at: datetime

class AlertUpdateSchema(BaseModel):
    reviewed: bool

class DashboardStatsResponse(BaseModel):
    total_analyzed: int
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int
    open_cases_count: int
    awaiting_review_count: int
    total_entities_tracked: int
    demo_mode: bool = True

class DashboardActivityItem(BaseModel):
    date: str
    high_risk: int
    medium_risk: int
    low_risk: int
    total: int

class NetworkNode(BaseModel):
    id: str
    label: str
    node_type: str # ad, case, entity_phone, entity_telegram, entity_url, entity_crypto
    risk_level: Optional[str] = None
    risk_score: Optional[float] = None
    metadata: Dict[str, Any] = {}

class NetworkEdge(BaseModel):
    id: str
    source: str
    target: str
    relationship: str # SHARED_TELEGRAM, SHARED_PHONE, SHARED_DOMAIN, TEXT_SIMILARITY, LINKED_CASE
    label: Optional[str] = None

class NetworkGraphResponse(BaseModel):
    nodes: List[NetworkNode]
    edges: List[NetworkEdge]
    stats: Dict[str, Any]
