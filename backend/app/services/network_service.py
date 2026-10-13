"""
FRAUDSCOPE AI — Advanced Threat Network & Coordination Detection Service
=========================================================================
Constructs forensic NetworkX graphs linking suspicious advertisements, cases,
and communication vectors.
Normalizes and sanitizes identifiers to prevent false cluster merges,
mitigates giant components from generic platforms, ranks connection strength,
and evaluates cluster purity and coverage against known ground truth campaigns.
"""

from typing import List, Dict, Any, Tuple, Optional, Set
import networkx as nx
from rapidfuzz import fuzz
from sqlalchemy.orm import Session

from app.models.models import Advertisement, Case, ExtractedEntity, case_advertisements
from app.services.entity_extraction import (
    sanitize_phone_number,
    GENERIC_PLATFORM_DOMAINS,
    GENERIC_TELEGRAM_HANDLES,
    DUMMY_UPI_HANDLES
)


def normalize_graph_identifier(entity_type: str, raw_value: str) -> Optional[Tuple[str, str, str]]:
    """
    Normalizes an identifier for graph link analysis.
    Returns (canonical_type, canonical_value, strength_tier) or None if invalid/placeholder.
    strength_tier in ('STRONG', 'MEDIUM', 'WEAK').
    """
    if not raw_value or not raw_value.strip():
        return None

    raw_clean = raw_value.strip()

    if entity_type in ["PHONE", "WHATSAPP"]:
        sanitized = sanitize_phone_number(raw_clean)
        if sanitized:
            return ("PHONE", sanitized, "STRONG")
        return None

    elif entity_type == "UPI_ID":
        norm = raw_clean.lower()
        if "@" in norm:
            user_part, handle_part = norm.split("@", 1)
            if norm in DUMMY_UPI_HANDLES or len(user_part) < 3:
                return None
            return ("UPI_ID", norm, "STRONG")
        return None

    elif entity_type == "TELEGRAM":
        handle = raw_clean.lstrip("@").lower().strip()
        if handle and handle not in GENERIC_TELEGRAM_HANDLES and len(handle) >= 3:
            return ("TELEGRAM", handle, "STRONG")
        return None

    elif entity_type in ["URL", "URL_DOMAIN"]:
        norm = raw_clean.lower().strip()
        # Filter generic platforms
        for generic in GENERIC_PLATFORM_DOMAINS:
            if norm == generic or norm.startswith(f"{generic}/") or norm.startswith(f"www.{generic}"):
                return None
        if len(norm) >= 4 and "." in norm:
            return ("URL", norm, "MEDIUM")
        return None

    elif entity_type == "EMAIL":
        norm = raw_clean.lower().strip()
        if not norm.endswith("@example.com") and not norm.endswith("@test.com"):
            return ("EMAIL", norm, "STRONG")
        return None

    elif entity_type == "CRYPTO":
        norm = raw_clean.lower().strip()
        if len(norm) >= 20:
            return ("CRYPTO", norm, "STRONG")
        return None

    return None


def build_threat_graph(
    db: Session,
    ad_limit: int = 50,
    similarity_threshold: float = 80.0,
    max_hub_degree: int = 25
) -> Dict[str, Any]:
    """
    Constructs a NetworkX forensic graph from database advertisements, cases, and entities.
    Returns nodes, edges, coordination rankings, and cluster statistics.
    """
    ads = db.query(Advertisement).order_by(Advertisement.id.desc()).limit(ad_limit).all()
    cases = db.query(Case).all()
    entities = db.query(ExtractedEntity).all()

    G = nx.Graph()
    nodes_list: List[Dict[str, Any]] = []
    edges_list: List[Dict[str, Any]] = []

    # Map of ad_id -> ad object
    ad_map = {ad.id: ad for ad in ads}
    ad_node_ids = set()

    # 1. Add Advertisement Nodes
    for ad in ads:
        node_id = f"ad_{ad.id}"
        ad_node_ids.add(node_id)
        risk_lvl = ad.analysis.risk_level if ad.analysis else "LOW"
        risk_scr = ad.analysis.risk_score if ad.analysis else 0.0

        node_data = {
            "id": node_id,
            "label": ad.custom_id or f"AD-{ad.id}",
            "node_type": "ad",
            "risk_level": risk_lvl,
            "risk_score": risk_scr,
            "metadata": {
                "db_id": ad.id,
                "preview": ad.original_text[:90] + ("..." if len(ad.original_text) > 90 else ""),
                "status": ad.review_status,
                "is_demo": ad.is_demo,
                "data_source": ad.data_source,
                "url": ad.submitted_url or "",
                "created_at": ad.created_at.strftime("%Y-%m-%d %H:%M") if ad.created_at else ""
            }
        }
        G.add_node(node_id, **node_data)
        nodes_list.append(node_data)

    # 2. Add Case Nodes and link to Advertisements
    for c in cases:
        c_node = f"case_{c.id}"
        case_data = {
            "id": c_node,
            "label": c.case_ref,
            "node_type": "case",
            "risk_level": c.priority,
            "risk_score": 85.0 if c.priority == "HIGH" else (50.0 if c.priority == "MEDIUM" else 20.0),
            "metadata": {
                "db_id": c.id,
                "title": c.title,
                "status": c.status,
                "assigned_to": c.assigned_to
            }
        }
        G.add_node(c_node, **case_data)
        nodes_list.append(case_data)

        # Linked advertisements
        linked_ads = db.query(Advertisement)\
            .join(case_advertisements, case_advertisements.c.advertisement_id == Advertisement.id)\
            .filter(case_advertisements.c.case_id == c.id)\
            .all()

        for la in linked_ads:
            la_node = f"ad_{la.id}"
            if la_node in ad_node_ids:
                edge_id = f"edge_{c_node}_{la_node}"
                G.add_edge(c_node, la_node, relationship="LINKED_CASE", weight=1.0)
                edges_list.append({
                    "id": edge_id,
                    "source": c_node,
                    "target": la_node,
                    "relationship": "LINKED_CASE",
                    "label": "Investigating Case",
                    "evidence_strength": "HIGH",
                    "coordination_status": "OFFICIAL_CASE_LINK",
                    "shared_identifiers": []
                })

    # 3. Collect Sanitized Entities per Advertisement
    ad_identifiers: Dict[int, List[Dict[str, str]]] = {ad.id: [] for ad in ads}
    for ent in entities:
        if ent.advertisement_id in ad_identifiers:
            norm_res = normalize_graph_identifier(ent.entity_type, ent.normalized_value or ent.entity_value)
            if norm_res:
                canon_type, canon_val, strength = norm_res
                ad_identifiers[ent.advertisement_id].append({
                    "type": canon_type,
                    "value": canon_val,
                    "strength": strength
                })

    # 4. Pairwise Link Analysis with Evidence Strength & Merging Safeguards
    # We map identifiers to ads to find commonalities
    identifier_to_ads: Dict[Tuple[str, str], Set[int]] = {}
    for aid, id_list in ad_identifiers.items():
        for item in id_list:
            key = (item["type"], item["value"])
            if key not in identifier_to_ads:
                identifier_to_ads[key] = set()
            identifier_to_ads[key].add(aid)

    # Check for over-connected hub degree to avoid giant component megamerges
    valid_identifier_to_ads = {
        k: v for k, v in identifier_to_ads.items()
        if len(v) <= max_hub_degree
    }

    # Connect pairwise ads
    connected_pairs: Dict[Tuple[int, int], List[Dict[str, str]]] = {}
    for (itype, ival), aid_set in valid_identifier_to_ads.items():
        if len(aid_set) >= 2:
            aids = sorted(list(aid_set))
            for i in range(len(aids)):
                for j in range(i + 1, len(aids)):
                    pair = (aids[i], aids[j])
                    if pair not in connected_pairs:
                        connected_pairs[pair] = []
                    connected_pairs[pair].append({"type": itype, "value": ival})

    # Add shared identifier edges between ads
    for (aid1, aid2), shared_ids in connected_pairs.items():
        u = f"ad_{aid1}"
        v = f"ad_{aid2}"
        if u in ad_node_ids and v in ad_node_ids:
            strong_count = sum(1 for s in shared_ids if s["type"] in ["PHONE", "UPI_ID", "TELEGRAM", "EMAIL"])
            if strong_count >= 2:
                strength = "VERY_HIGH"
                coord_status = "CONFIRMED_COORDINATION"
                rel_label = f"Confirmed Syndicate ({len(shared_ids)} Vectors)"
            elif strong_count == 1:
                strength = "HIGH"
                coord_status = "STRONG_LINK"
                rel_label = f"Shared {shared_ids[0]['type']}: {shared_ids[0]['value']}"
            else:
                strength = "MEDIUM"
                coord_status = "POTENTIALLY_CONNECTED"
                rel_label = f"Shared Infrastructure: {shared_ids[0]['value']}"

            edge_id = f"edge_coord_{aid1}_{aid2}"
            G.add_edge(u, v, relationship=coord_status, shared=shared_ids)
            edges_list.append({
                "id": edge_id,
                "source": u,
                "target": v,
                "relationship": coord_status,
                "label": rel_label,
                "evidence_strength": strength,
                "coordination_status": coord_status,
                "shared_identifiers": shared_ids
            })

    # 5. Near-Duplicate Campaign Text Links (Weak / Potential Coordination)
    for i in range(len(ads)):
        for j in range(i + 1, len(ads)):
            pair = (ads[i].id, ads[j].id)
            # Only test if not already strongly connected
            if pair not in connected_pairs:
                ad1 = ads[i]
                ad2 = ads[j]
                ratio = fuzz.token_sort_ratio(ad1.normalized_text, ad2.normalized_text)
                if ratio >= similarity_threshold:
                    u = f"ad_{ad1.id}"
                    v = f"ad_{ad2.id}"
                    edge_id = f"edge_sim_{ad1.id}_{ad2.id}"
                    G.add_edge(u, v, relationship="TEXT_SIMILARITY", similarity=ratio)
                    edges_list.append({
                        "id": edge_id,
                        "source": u,
                        "target": v,
                        "relationship": "TEXT_SIMILARITY",
                        "label": f"{round(ratio)}% Campaign Template Similarity",
                        "evidence_strength": "LOW",
                        "coordination_status": "POTENTIALLY_CONNECTED",
                        "shared_identifiers": [{"type": "TEXT_TEMPLATE", "value": f"{round(ratio)}% text match"}]
                    })

    # 6. Community / Connected Components Detection
    ad_subgraph = G.subgraph(ad_node_ids)
    components = list(nx.connected_components(ad_subgraph))
    clusters_summary = []
    for idx, comp in enumerate(components):
        if len(comp) >= 2:
            comp_nodes = list(comp)
            cluster_ads = [ad_map[int(nid.split("_")[1])] for nid in comp_nodes if nid.startswith("ad_")]
            avg_risk = sum((a.analysis.risk_score if a.analysis else 0.0) for a in cluster_ads) / len(cluster_ads)
            clusters_summary.append({
                "cluster_index": idx + 1,
                "size": len(cluster_ads),
                "ad_ids": [a.id for a in cluster_ads],
                "average_risk_score": round(avg_risk, 1),
                "high_risk_count": sum(1 for a in cluster_ads if (a.analysis and a.analysis.risk_level == "HIGH"))
            })

    clusters_summary.sort(key=lambda x: x["size"], reverse=True)

    return {
        "nodes": nodes_list,
        "edges": edges_list,
        "total_nodes": len(nodes_list),
        "total_edges": len(edges_list),
        "active_clusters_count": len(clusters_summary),
        "clusters_summary": clusters_summary
    }


def evaluate_cluster_detection(dataset_path: str) -> Dict[str, Any]:
    """
    Evaluates the coordination graph clustering logic against ground truth labels
    (cluster_id C01 through C14 in the uploaded benchmark dataset).
    Calculates cluster coverage, purity, false merges, and missed connections.
    """
    import pandas as pd

    df = pd.read_csv(dataset_path, sep="\t") if "\t" in open(dataset_path, "r", encoding="utf-8").read(500) else pd.read_csv(dataset_path)
    clustered_df = df[df["cluster_id"].notna()].copy()

    if clustered_df.empty:
        return {
            "error": "No ground truth cluster_id annotations found in dataset.",
            "coverage": 0.0,
            "purity": 0.0
        }

    G = nx.Graph()
    ad_identifiers: Dict[str, List[Tuple[str, str]]] = {}

    for _, row in clustered_df.iterrows():
        pid = str(row["post_id"])
        G.add_node(pid, ground_truth=str(row["cluster_id"]))
        id_list = []

        # Phone
        if pd.notna(row.get("phone")):
            norm_p = normalize_graph_identifier("PHONE", str(row["phone"]))
            if norm_p:
                id_list.append((norm_p[0], norm_p[1]))

        # UPI
        if pd.notna(row.get("upi_id")):
            norm_u = normalize_graph_identifier("UPI_ID", str(row["upi_id"]))
            if norm_u:
                id_list.append((norm_u[0], norm_u[1]))

        # URL
        if pd.notna(row.get("url")):
            norm_url = normalize_graph_identifier("URL", str(row["url"]))
            if norm_url:
                id_list.append((norm_url[0], norm_url[1]))

        ad_identifiers[pid] = id_list

    # Connect nodes sharing strong identifiers
    id_map: Dict[Tuple[str, str], List[str]] = {}
    for pid, ids in ad_identifiers.items():
        for ident in ids:
            if ident not in id_map:
                id_map[ident] = []
            id_map[ident].append(pid)

    for ident, pids in id_map.items():
        if len(pids) >= 2:
            for i in range(len(pids)):
                for j in range(i + 1, len(pids)):
                    G.add_edge(pids[i], pids[j], identifier=ident)

    # Evaluate detected components vs ground truth clusters
    components = list(nx.connected_components(G))
    gt_clusters = clustered_df.groupby("cluster_id")["post_id"].apply(lambda s: set(s.astype(str))).to_dict()

    # 1. False Merges: a detected component contains posts from multiple distinct ground truth clusters
    false_merges = 0
    purities = []

    for comp in components:
        if len(comp) >= 2:
            # Map of ground truth labels in this component
            labels_in_comp = [G.nodes[n]["ground_truth"] for n in comp]
            label_counts = pd.Series(labels_in_comp).value_counts()
            dominant_count = label_counts.iloc[0]
            purity = dominant_count / len(labels_in_comp)
            purities.append(purity)
            if len(label_counts) > 1:
                false_merges += 1

    # 2. Cluster Coverage: ground truth items that were successfully grouped with >= 1 same-cluster peer
    covered_items = 0
    total_items = len(clustered_df)

    for pid in clustered_df["post_id"].astype(str):
        neighbors = set(G.neighbors(pid))
        if neighbors:
            my_gt = G.nodes[pid]["ground_truth"]
            same_cluster_neighbors = [n for n in neighbors if G.nodes[n]["ground_truth"] == my_gt]
            if len(same_cluster_neighbors) > 0:
                covered_items += 1

    avg_purity = sum(purities) / len(purities) if purities else 1.0
    coverage_rate = covered_items / total_items if total_items > 0 else 0.0

    return {
        "total_ground_truth_items": total_items,
        "total_ground_truth_clusters": len(gt_clusters),
        "detected_connected_components": len(components),
        "cluster_coverage_rate": round(coverage_rate, 4),
        "cluster_purity_average": round(avg_purity, 4),
        "false_cluster_merges": false_merges,
        "missed_connections": total_items - covered_items
    }
