export interface TriggeredRule {
  rule_id: string;
  rule_name: string;
  category: string;
  weight: number;
  matched_phrases: string[];
  explanation: string;
}

export interface AnalysisResult {
  id?: number;
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  model_available: boolean;
  model_signal?: number | null;
  explanation: string;
  recommended_review_action: string;
  triggered_rules: TriggeredRule[];
  suspicious_phrases: string[];
  is_duplicate?: boolean;
  duplicate_of_id?: string | null;
  near_duplicate_matches?: Array<{
    advertisement_id: number;
    custom_id: string;
    similarity_score: number;
    preview: string;
    review_status: string;
  }>;
}

export interface ExtractedEntity {
  id?: number;
  entity_type: 'PHONE' | 'TELEGRAM' | 'WHATSAPP' | 'URL_DOMAIN' | 'CRYPTO' | 'EMAIL' | string;
  entity_value: string;
  normalized_value: string;
}

export interface EvidenceItem {
  id?: number;
  evidence_type: string;
  matched_text: string;
  description: string;
  source_location?: string;
  created_at?: string;
}

export interface AdvertisementSummary {
  id: number;
  custom_id?: string;
  original_text: string;
  source_type: string;
  submitted_url?: string | null;
  risk_score?: number | null;
  risk_level?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  review_status: 'NEW' | 'NEEDS_REVIEW' | 'UNDER_INVESTIGATION' | 'ESCALATED' | 'CLOSED' | 'FALSE_POSITIVE';
  created_at: string;
  entities_count: number;
  cases_count: number;
}

export interface AdvertisementDetail {
  id: number;
  custom_id?: string;
  original_text: string;
  normalized_text: string;
  source_type: string;
  submitted_url?: string | null;
  content_hash: string;
  review_status: 'NEW' | 'NEEDS_REVIEW' | 'UNDER_INVESTIGATION' | 'ESCALATED' | 'CLOSED' | 'FALSE_POSITIVE';
  created_at: string;
  analysis?: AnalysisResult;
  evidence_items: EvidenceItem[];
  entities: ExtractedEntity[];
  related_ads: Array<{
    id: number;
    custom_id?: string;
    relation_type: string;
    preview: string;
    review_status: string;
  }>;
  cases: Array<{
    id: number;
    case_ref: string;
    title: string;
    status: string;
    priority: string;
  }>;
}

export interface CaseNote {
  id: number;
  case_id: number;
  note: string;
  actor: string;
  created_at: string;
}

export interface CaseItem {
  id: number;
  case_ref: string;
  title: string;
  description?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'ESCALATED' | 'CLOSED';
  assigned_to: string;
  created_at: string;
  updated_at: string;
  advertisements_count: number;
  advertisements: AdvertisementSummary[];
  notes: CaseNote[];
}

export interface AlertItem {
  id: number;
  advertisement_id?: number | null;
  custom_id?: string | null;
  alert_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  reviewed: boolean;
  created_at: string;
}

export interface DashboardStats {
  total_analyzed: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  open_cases_count: number;
  awaiting_review_count: number;
  total_entities_tracked: number;
  demo_mode: boolean;
}

export interface DashboardActivity {
  date: string;
  high_risk: number;
  medium_risk: number;
  low_risk: number;
  total: number;
}

export interface NetworkNode {
  id: string;
  label: string;
  node_type: string;
  risk_level?: string;
  risk_score?: number;
  metadata?: Record<string, any>;
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  relationship: string;
  label?: string;
}

export interface ThreatNetworkData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  stats: {
    total_nodes: number;
    total_edges: number;
    ad_nodes: number;
    case_nodes: number;
    shared_entity_nodes: number;
  };
}

export interface SystemSettings {
  risk_threshold_low: number;
  risk_threshold_high: number;
  similarity_threshold: number;
  demo_mode: boolean;
  ml_model: {
    status: string;
    type: string;
    version: string;
  };
  active_rules: Array<{
    id: string;
    name: string;
    category: string;
    weight: number;
    description: string;
  }>;
  platform: {
    name: string;
    version: string;
    environment: string;
  };
}
