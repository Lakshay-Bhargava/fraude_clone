from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from rapidfuzz import fuzz

from app.database.session import get_db
from app.models.models import Advertisement, AnalysisResult, Case, ExtractedEntity, case_advertisements
from app.schemas.schemas import NetworkGraphResponse, NetworkNode, NetworkEdge

router = APIRouter(prefix="/network", tags=["Threat Network"])

@router.get("", response_model=NetworkGraphResponse)
def get_threat_network(db: Session = Depends(get_db)):
    """
    Builds an interactive forensic graph connecting advertisements, cases,
    shared communication channels, and near-duplicate campaign clusters.
    """
    ads = db.query(Advertisement).limit(30).all()
    cases = db.query(Case).all()
    entities = db.query(ExtractedEntity).all()

    nodes: List[NetworkNode] = []
    edges: List[NetworkEdge] = []
    node_ids = set()

    # 1. Add Advertisement Nodes
    for ad in ads:
        node_id = f"ad_{ad.id}"
        node_ids.add(node_id)
        risk_lvl = ad.analysis.risk_level if ad.analysis else "LOW"
        risk_scr = ad.analysis.risk_score if ad.analysis else 0.0

        nodes.append(NetworkNode(
            id=node_id,
            label=ad.custom_id or f"AD-{ad.id}",
            node_type="ad",
            risk_level=risk_lvl,
            risk_score=risk_scr,
            metadata={
                "db_id": ad.id,
                "preview": ad.original_text[:90] + ("..." if len(ad.original_text) > 90 else ""),
                "status": ad.review_status,
                "url": ad.submitted_url or "",
                "created_at": ad.created_at.strftime("%Y-%m-%d %H:%M") if ad.created_at else ""
            }
        ))

    # 2. Add Case Nodes
    for c in cases:
        node_id = f"case_{c.id}"
        node_ids.add(node_id)
        nodes.append(NetworkNode(
            id=node_id,
            label=c.case_ref,
            node_type="case",
            risk_level=c.priority,
            metadata={
                "db_id": c.id,
                "title": c.title,
                "status": c.status,
                "assigned_to": c.assigned_to
            }
        ))

    # 3. Add Edges between Cases and Advertisements
    for c in cases:
        c_node = f"case_{c.id}"
        linked_ads = db.query(Advertisement)\
            .join(case_advertisements, case_advertisements.c.advertisement_id == Advertisement.id)\
            .filter(case_advertisements.c.case_id == c.id)\
            .all()

        for la in linked_ads:
            la_node = f"ad_{la.id}"
            if la_node in node_ids:
                edges.append(NetworkEdge(
                    id=f"edge_{c_node}_{la_node}",
                    source=c_node,
                    target=la_node,
                    relationship="LINKED_CASE",
                    label="Investigating"
                ))

    # 4. Group Extracted Entities to find shared contact vectors
    entity_clusters: Dict[tuple, List[int]] = {}
    for ent in entities:
        key = (ent.entity_type, ent.normalized_value)
        if key not in entity_clusters:
            entity_clusters[key] = []
        if ent.advertisement_id not in entity_clusters[key]:
            entity_clusters[key].append(ent.advertisement_id)

    # For any entity shared by 2 or more ads, create an Entity Node and link the ads to it!
    for (etype, norm_val), ad_ids in entity_clusters.items():
        if len(ad_ids) >= 2:
            ent_node_id = f"entity_{etype.lower()}_{norm_val[:16]}"
            if ent_node_id not in node_ids:
                node_ids.add(ent_node_id)
                nodes.append(NetworkNode(
                    id=ent_node_id,
                    label=f"{etype}: {norm_val}",
                    node_type=f"entity_{etype.lower()}",
                    metadata={
                        "type": etype,
                        "value": norm_val,
                        "connected_ads": len(ad_ids)
                    }
                ))

            # Connect ads to the shared entity node
            for aid in ad_ids:
                ad_node = f"ad_{aid}"
                if ad_node in node_ids:
                    edges.append(NetworkEdge(
                        id=f"edge_{ad_node}_{ent_node_id}",
                        source=ad_node,
                        target=ent_node_id,
                        relationship=f"SHARED_{etype}",
                        label=f"Channels: {norm_val}"
                    ))

    # 5. Near-Duplicate Text Connections between Ads
    for i in range(len(ads)):
        for j in range(i + 1, len(ads)):
            ad1 = ads[i]
            ad2 = ads[j]
            ratio = fuzz.token_sort_ratio(ad1.normalized_text, ad2.normalized_text)
            if ratio >= 75: # high text similarity
                node1 = f"ad_{ad1.id}"
                node2 = f"ad_{ad2.id}"
                edges.append(NetworkEdge(
                    id=f"edge_sim_{ad1.id}_{ad2.id}",
                    source=node1,
                    target=node2,
                    relationship="TEXT_SIMILARITY",
                    label=f"{ratio}% Similar Text"
                ))

    return NetworkGraphResponse(
        nodes=nodes,
        edges=edges,
        stats={
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "ad_nodes": len([n for n in nodes if n.node_type == "ad"]),
            "case_nodes": len([n for n in nodes if n.node_type == "case"]),
            "shared_entity_nodes": len([n for n in nodes if n.node_type.startswith("entity_")])
        }
    )
