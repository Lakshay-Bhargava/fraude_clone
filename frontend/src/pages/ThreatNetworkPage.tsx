import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import * as d3Force from 'd3-force';
import {
  RefreshCw,
  Info,
  X,
  Search,
  Maximize2,
  ChevronDown,
  ChevronUp,
  FileDown,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  Phone,
  MessageSquare,
  Globe,
  CreditCard,
  Hash,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Layers
} from 'lucide-react';
import { api } from '../services/api';
import { ThreatNetworkData, NetworkNode } from '../types';
import { RiskBadge } from '../components/ui/RiskBadge';
import { generateCaseReportPdf } from '../services/pdfReportGenerator';
import { MuleNetwork3D } from '../components/visualizations/MuleNetwork3D';

// Types for D3 simulation
interface GraphNode extends d3Force.SimulationNodeDatum {
  id: string;
  kind: 'ad' | 'hub' | 'collapsed_cluster';
  label: string;
  hubType?: string;
  hubValue?: string;
  riskLevel?: string;
  riskScore?: number;
  radius: number;
  isBridge?: boolean;
  platform?: string;
  metadata?: any;
  clusterId?: string;
  connectedHubCount?: number;
  // d3 properties
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphLink extends d3Force.SimulationLinkDatum<GraphNode> {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  relationship: string;
  label?: string;
  isHubLink?: boolean;
}

interface ClusterHalo {
  id: string;
  hubId: string;
  label: string;
  hubType: string;
  hubValue: string;
  cx: number;
  cy: number;
  radius: number;
  adCount: number;
}

export const ThreatNetworkPage: React.FC = () => {
  const [networkData, setNetworkData] = useState<ThreatNetworkData | null>(null);
  const [loading, setLoading] = useState(true);

  // View Mode: 2D Force Directed Graph vs 3D Threat Radar
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');

  // Filters and Controls
  const [riskFilter, setRiskFilter] = useState<'All' | 'HIGH' | 'MEDIUM' | 'LOW'>('All');
  const [platformFilter, setPlatformFilter] = useState('All');
  const [entityTypeFilter, setEntityTypeFilter] = useState<'All' | 'PHONE' | 'UPI' | 'TELEGRAM' | 'URL' | 'ad'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [noticeExpanded, setNoticeExpanded] = useState(false);

  // Selection & Hover
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // PDF Generation State
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfNotice, setPdfNotice] = useState<string | null>(null);

  // Collapsed clusters state (clusterId -> boolean)
  const [collapsedClusters, setCollapsedClusters] = useState<Record<string, boolean>>({});

  // SVG Pan & Zoom State
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Simulation state
  const [simNodes, setSimNodes] = useState<GraphNode[]>([]);
  const [simLinks, setSimLinks] = useState<GraphLink[]>([]);
  const simulationRef = useRef<d3Force.Simulation<GraphNode, GraphLink> | null>(null);

  // Fetch threat network data
  const fetchNetwork = async () => {
    try {
      setLoading(true);
      const data = await api.getThreatNetwork();
      setNetworkData(data);
    } catch (err) {
      console.error('Failed to load threat network data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNetwork();
  }, []);

  // 1. Process network data into Hubs, Ads, and Links
  const rawGraph = useMemo(() => {
    if (!networkData) return { nodes: [], links: [], hubMap: new Map() };

    const hubMap = new Map<string, { type: string; value: string; ads: Set<string> }>();
    const adNodesMap = new Map<string, any>();

    // Index all advertisement nodes
    networkData.nodes.forEach((n) => {
      if (n.node_type === 'ad') {
        adNodesMap.set(n.id, n);
      }
    });

    // Extract identifier hubs from edges containing shared_identifiers
    networkData.edges.forEach((edge: any) => {
      if (edge.shared_identifiers && Array.isArray(edge.shared_identifiers)) {
        edge.shared_identifiers.forEach((ident: { type: string; value: string }) => {
          if (!ident.value || !ident.value.trim()) return;
          const hubKey = `${ident.type}:${ident.value.trim().toLowerCase()}`;
          if (!hubMap.has(hubKey)) {
            hubMap.set(hubKey, {
              type: ident.type,
              value: ident.value.trim(),
              ads: new Set<string>()
            });
          }
          const hub = hubMap.get(hubKey)!;
          if (edge.source.startsWith('ad_')) hub.ads.add(edge.source);
          if (edge.target.startsWith('ad_')) hub.ads.add(edge.target);
        });
      }
    });

    // Also extract identifiers directly from ad metadata if available
    adNodesMap.forEach((adNode, adId) => {
      const entities = adNode.metadata?.entities || [];
      entities.forEach((ent: { type: string; value: string }) => {
        if (!ent.value || !ent.value.trim()) return;
        const normType = ent.type.replace('entity_', '').toUpperCase();
        if (['PHONE', 'UPI_ID', 'UPI', 'URL', 'URL_DOMAIN', 'TELEGRAM', 'EMAIL'].includes(normType)) {
          const hubKey = `${normType}:${ent.value.trim().toLowerCase()}`;
          if (!hubMap.has(hubKey)) {
            hubMap.set(hubKey, {
              type: normType,
              value: ent.value.trim(),
              ads: new Set<string>()
            });
          }
          hubMap.get(hubKey)!.ads.add(adId);
        }
      });
    });

    return { rawNodes: networkData.nodes, rawEdges: networkData.edges, hubMap, adNodesMap };
  }, [networkData]);

  // 2. Build filtered graph elements based on user filters
  const filteredGraph = useMemo(() => {
    if (!rawGraph.adNodesMap) return { nodes: [], links: [], hubs: [] };

    const { adNodesMap, hubMap, rawEdges } = rawGraph;
    const query = searchQuery.trim().toLowerCase();

    // Determine which ads match the active filters
    const matchedAdIds = new Set<string>();

    adNodesMap.forEach((ad: NetworkNode, adId: string) => {
      const riskMatch = riskFilter === 'All' || ad.risk_level?.toUpperCase() === riskFilter;
      const adPlatform = (ad.metadata?.platform || 'Unknown').toLowerCase();
      const platformMatch = platformFilter === 'All' || adPlatform === platformFilter.toLowerCase();

      let searchMatch = true;
      if (query) {
        const customId = (ad.label || '').toLowerCase();
        const preview = (ad.metadata?.preview || '').toLowerCase();
        const url = (ad.metadata?.url || '').toLowerCase();
        const entityValues = (ad.metadata?.entities || []).map((e: any) => e.value.toLowerCase()).join(' ');

        searchMatch =
          customId.includes(query) ||
          preview.includes(query) ||
          url.includes(query) ||
          entityValues.includes(query);
      }

      if (riskMatch && platformMatch && searchMatch) {
        matchedAdIds.add(adId);
      }
    });

    // Determine active hubs (hubs that have at least 1 matching ad, or whose name matches search)
    const activeHubs: { id: string; type: string; value: string; ads: string[] }[] = [];
    const adToHubsMap = new Map<string, string[]>();

    hubMap.forEach((hubData, hubKey) => {
      if (entityTypeFilter !== 'All') {
        if (entityTypeFilter === 'ad') return;
        const hType = hubData.type.toUpperCase();
        if (entityTypeFilter === 'PHONE' && hType !== 'PHONE') return;
        if (entityTypeFilter === 'UPI' && !hType.includes('UPI')) return;
        if (entityTypeFilter === 'TELEGRAM' && hType !== 'TELEGRAM') return;
        if (entityTypeFilter === 'URL' && !hType.includes('URL')) return;
      }

      const hubId = `hub_${hubKey.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      const relevantAds = Array.from(hubData.ads).filter((id) => matchedAdIds.has(id));

      const hubMatchesSearch = query && (
        hubData.value.toLowerCase().includes(query) ||
        hubData.type.toLowerCase().includes(query)
      );

      if (relevantAds.length > 0 || hubMatchesSearch) {
        activeHubs.push({
          id: hubId,
          type: hubData.type,
          value: hubData.value,
          ads: relevantAds
        });

        relevantAds.forEach((adId) => {
          if (!adToHubsMap.has(adId)) adToHubsMap.set(adId, []);
          adToHubsMap.get(adId)!.push(hubId);
        });
      }
    });

    // Check for large clusters (> 50 nodes) to collapse
    const autoCollapsed: Record<string, boolean> = { ...collapsedClusters };
    activeHubs.forEach((hub) => {
      if (hub.ads.length > 50 && autoCollapsed[hub.id] === undefined) {
        autoCollapsed[hub.id] = true;
      }
    });

    // Construct final simulation nodes
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const includedNodeIds = new Set<string>();

    // A. Add Hub Nodes
    activeHubs.forEach((hub) => {
      const isCollapsed = autoCollapsed[hub.id] === true;
      nodes.push({
        id: hub.id,
        kind: 'hub',
        label: `${hub.type}: ${hub.value}`,
        hubType: hub.type,
        hubValue: hub.value,
        radius: isCollapsed ? 32 : 18,
        metadata: {
          hubType: hub.type,
          hubValue: hub.value,
          totalAds: hub.ads.length,
          adIds: hub.ads,
          isCollapsed
        }
      });
      includedNodeIds.add(hub.id);

      // If collapsed, don't add individual ad nodes for this hub unless they bridge to an uncollapsed hub
      if (!isCollapsed) {
        hub.ads.forEach((adId) => {
          if (!includedNodeIds.has(adId)) {
            const rawAd = adNodesMap.get(adId);
            if (rawAd) {
              const rScore = rawAd.risk_score ?? 50;
              // Size proportional to risk score: 8px to 18px
              const adRadius = 8 + (Math.max(0, Math.min(100, rScore)) / 100) * 10;
              const connectedHubs = adToHubsMap.get(adId) || [];

              nodes.push({
                id: adId,
                kind: 'ad',
                label: rawAd.label || `AD-${rawAd.metadata?.db_id}`,
                riskLevel: rawAd.risk_level || 'LOW',
                riskScore: rScore,
                radius: adRadius,
                isBridge: connectedHubs.length >= 2,
                connectedHubCount: connectedHubs.length,
                platform: rawAd.metadata?.platform || 'Unknown',
                metadata: rawAd.metadata || {}
              });
              includedNodeIds.add(adId);
            }
          }

          // Link ad to this hub
          links.push({
            id: `link_${hub.id}_${adId}`,
            source: hub.id,
            target: adId,
            relationship: `Shared ${hub.type}`,
            label: `Shared ${hub.type}`,
            isHubLink: true
          });
        });
      }
    });

    // B. Add campaign text similarity edges between included ads
    if (rawEdges) {
      rawEdges.forEach((e: any) => {
        if (
          e.relationship === 'TEXT_SIMILARITY' &&
          includedNodeIds.has(e.source) &&
          includedNodeIds.has(e.target)
        ) {
          links.push({
            id: e.id,
            source: e.source,
            target: e.target,
            relationship: 'TEXT_SIMILARITY',
            label: 'Campaign Template Similarity',
            isHubLink: false
          });
        }
      });
    }

    return { nodes, links, hubs: activeHubs };
  }, [rawGraph, riskFilter, platformFilter, entityTypeFilter, searchQuery, collapsedClusters]);

  // 3. Run D3 Force Simulation with node collision & cluster spacing
  useEffect(() => {
    if (filteredGraph.nodes.length === 0) {
      setSimNodes([]);
      setSimLinks([]);
      return;
    }

    // Stop previous simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const width = 1000;
    const height = 650;
    const centerX = width / 2;
    const centerY = height / 2;

    // Deep copy nodes and links for D3 mutation
    const nodesCopy: GraphNode[] = filteredGraph.nodes.map((n, i) => {
      // Seed positions in organic radial rings around center to prevent stacking
      const angle = (i / Math.max(1, filteredGraph.nodes.length)) * 2 * Math.PI;
      const dist = n.kind === 'hub' ? 140 : 260;
      return {
        ...n,
        x: n.x ?? centerX + Math.cos(angle) * dist + (Math.random() - 0.5) * 40,
        y: n.y ?? centerY + Math.sin(angle) * dist + (Math.random() - 0.5) * 40
      };
    });

    const linksCopy: GraphLink[] = filteredGraph.links.map((l) => ({
      ...l,
      source: typeof l.source === 'object' ? (l.source as GraphNode).id : l.source,
      target: typeof l.target === 'object' ? (l.target as GraphNode).id : l.target
    }));

    // Configure D3 Force Simulation with anti-stacking collision
    const sim = d3Force
      .forceSimulation<GraphNode>(nodesCopy)
      .force(
        'link',
        d3Force
          .forceLink<GraphNode, GraphLink>(linksCopy)
          .id((d) => d.id)
          .distance((d) => (d.isHubLink ? 95 : 140))
          .strength(0.65)
      )
      .force(
        'charge',
        d3Force
          .forceManyBody<GraphNode>()
          .strength((d) => (d.kind === 'hub' ? -750 : -220))
          .distanceMax(450)
      )
      .force(
        'collide',
        d3Force
          .forceCollide<GraphNode>()
          .radius((d) => d.radius + 18)
          .iterations(4)
      )
      .force('center', d3Force.forceCenter(centerX, centerY).strength(0.05))
      .force('x', d3Force.forceX(centerX).strength(0.04))
      .force('y', d3Force.forceY(centerY).strength(0.04))
      .alpha(1)
      .alphaDecay(0.035);

    sim.on('tick', () => {
      setSimNodes([...nodesCopy]);
      setSimLinks([...linksCopy]);
    });

    // Run 60 fast warmup ticks to resolve collisions before initial render
    for (let i = 0; i < 60; ++i) sim.tick();

    simulationRef.current = sim;

    return () => {
      sim.stop();
    };
  }, [filteredGraph]);

  // 4. Compute cluster halos (bounding circles around hubs and their connected ads)
  const clusterHalos = useMemo<ClusterHalo[]>(() => {
    if (simNodes.length === 0) return [];

    const nodeMap = new Map<string, GraphNode>();
    simNodes.forEach((n) => nodeMap.set(n.id, n));

    const halos: ClusterHalo[] = [];

    filteredGraph.hubs.forEach((hub) => {
      const hubNode = nodeMap.get(hub.id);
      if (!hubNode || hubNode.x === undefined || hubNode.y === undefined) return;
      const hx = hubNode.x;
      const hy = hubNode.y;

      let maxDist = 45;
      let count = 0;

      hub.ads.forEach((adId) => {
        const adNode = nodeMap.get(adId);
        if (adNode && adNode.x !== undefined && adNode.y !== undefined) {
          const dx = adNode.x - hx;
          const dy = adNode.y - hy;
          const dist = Math.sqrt(dx * dx + dy * dy) + adNode.radius;
          if (dist > maxDist) maxDist = dist;
          count++;
        }
      });

      halos.push({
        id: `halo_${hub.id}`,
        hubId: hub.id,
        label: `${hub.type}: ${hub.value}`,
        hubType: hub.type,
        hubValue: hub.value,
        cx: hx,
        cy: hy,
        radius: maxDist + 16,
        adCount: count
      });
    });

    return halos;
  }, [simNodes, filteredGraph.hubs]);

  // Set of IDs directly connected to the active/hovered node
  const highlightedIds = useMemo(() => {
    const target = hoveredNode || selectedNode;
    if (!target) return null;

    const ids = new Set<string>();
    ids.add(target.id);

    simLinks.forEach((l) => {
      const sId = typeof l.source === 'object' ? l.source.id : l.source;
      const tId = typeof l.target === 'object' ? l.target.id : l.target;
      if (sId === target.id) ids.add(tId);
      if (tId === target.id) ids.add(sId);
    });

    return ids;
  }, [hoveredNode, selectedNode, simLinks]);

  // Zoom to fit bounds
  const handleZoomToFit = useCallback(() => {
    if (simNodes.length === 0 || !svgRef.current) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    simNodes.forEach((n) => {
      if (n.x !== undefined && n.y !== undefined) {
        if (n.x < minX) minX = n.x;
        if (n.x > maxX) maxX = n.x;
        if (n.y < minY) minY = n.y;
        if (n.y > maxY) maxY = n.y;
      }
    });

    const padding = 60;
    const boxW = Math.max(100, maxX - minX + padding * 2);
    const boxH = Math.max(100, maxY - minY + padding * 2);

    const clientW = svgRef.current.clientWidth || 900;
    const clientH = svgRef.current.clientHeight || 600;

    const scale = Math.max(0.3, Math.min(1.8, Math.min(clientW / boxW, clientH / boxH)));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setTransform({
      x: clientW / 2 - centerX * scale,
      y: clientH / 2 - centerY * scale,
      k: scale
    });
  }, [simNodes]);

  // Reset layout & simulation
  const handleResetLayout = () => {
    if (simulationRef.current) {
      simulationRef.current.alpha(1).restart();
    }
    handleZoomToFit();
  };

  // SVG Pan Handlers
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    // Only start pan if clicking directly on background
    if (e.target === svgRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning) {
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      }));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // SVG Wheel Zoom
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setTransform((prev) => {
      const nextK = Math.max(0.2, Math.min(3.5, prev.k * zoomFactor));
      // Zoom centered at mouse position
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return { ...prev, k: nextK };
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      return {
        k: nextK,
        x: mouseX - (mouseX - prev.x) * (nextK / prev.k),
        y: mouseY - (mouseY - prev.y) * (nextK / prev.k)
      };
    });
  };

  // Handle PDF report generation from graph detail panel
  const handleGeneratePdf = () => {
    if (!selectedNode || selectedNode.kind !== 'ad') return;
    setPdfGenerating(true);
    setPdfNotice(null);

    const meta = selectedNode.metadata || {};
    const adSummary: any = {
      id: meta.db_id || 1,
      custom_id: selectedNode.label,
      original_text: meta.preview || 'Financial ad investigation snippet',
      normalized_text: meta.preview || '',
      source_type: 'text',
      review_status: meta.status || 'UNDER_INVESTIGATION',
      platform: selectedNode.platform || 'Telegram',
      created_at: meta.created_at || new Date().toISOString(),
      analysis: {
        risk_score: selectedNode.riskScore || 75,
        risk_level: selectedNode.riskLevel || 'HIGH',
        explanation: 'Flagged by FraudScope AI Threat Network Cluster analysis.'
      }
    };

    setTimeout(() => {
      const success = generateCaseReportPdf(adSummary);
      setPdfGenerating(false);
      if (success) {
        setPdfNotice(`Case Dossier PDF generated successfully for ${selectedNode.label}!`);
      }
    }, 400);
  };

  // Node colour helper: high #E5484D, medium #F5A524, low #2FA97C
  const getAdColor = (level?: string) => {
    switch ((level || '').toUpperCase()) {
      case 'HIGH':
        return '#E5484D';
      case 'MEDIUM':
        return '#F5A524';
      default:
        return '#2FA97C';
    }
  };

  // Hub Icon Helper
  const renderHubIcon = (hubType?: string) => {
    const t = (hubType || '').toUpperCase();
    if (t.includes('PHONE') || t.includes('WHATSAPP')) {
      return <Phone className="w-3.5 h-3.5 text-white" />;
    }
    if (t.includes('TELEGRAM')) {
      return <MessageSquare className="w-3.5 h-3.5 text-white" />;
    }
    if (t.includes('URL') || t.includes('DOMAIN')) {
      return <Globe className="w-3.5 h-3.5 text-white" />;
    }
    if (t.includes('UPI')) {
      return <CreditCard className="w-3.5 h-3.5 text-white" />;
    }
    return <Hash className="w-3.5 h-3.5 text-white" />;
  };

  return (
    <div className="space-y-3.5 h-[calc(100vh-8rem)] flex flex-col max-w-7xl mx-auto">
      {/* 1. Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)] tracking-tight">
              Clusters / Networks
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-[var(--radius)] bg-[var(--card)] border border-[var(--border)] text-[var(--accent)] font-semibold">
              Force-Directed Entity Graph
            </span>
          </div>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Real-time relationship mapping connecting ads, phone numbers, UPI handles, and messaging vectors.
          </p>
        </div>

        {/* Global Action CTAs & View Switcher */}
        <div className="flex items-center gap-2">
          {/* View Mode Toggle: 2D Force Graph vs 3D Threat Radar */}
          <div className="flex items-center p-0.5 rounded-[var(--radius)] bg-[var(--card)] border border-[var(--border)]">
            <button
              onClick={() => setViewMode('2d')}
              className={`text-xs px-2.5 py-1 rounded-[var(--radius)] font-mono font-medium transition-all ${
                viewMode === '2d'
                  ? 'bg-[var(--accent)] text-white shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              2D Force Graph
            </button>
            <button
              onClick={() => setViewMode('3d')}
              className={`text-xs px-2.5 py-1 rounded-[var(--radius)] font-mono font-medium transition-all ${
                viewMode === '3d'
                  ? 'bg-[var(--accent)] text-white shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              3D Mule Radar
            </button>
          </div>

          {viewMode === '2d' && (
            <>
              <button
                onClick={handleZoomToFit}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                title="Fit network in view"
                aria-label="Zoom to fit"
              >
                <Maximize2 className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Fit View</span>
              </button>
              <button
                onClick={handleResetLayout}
                className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                title="Re-run physics simulation"
                aria-label="Reset layout"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Reset</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. Collapsible Investigative Notice Banner */}
      <div className="rounded-[var(--radius)] bg-[var(--card)] border border-[var(--border)] text-xs text-[var(--text)] overflow-hidden shadow-2xs shrink-0">
        <button
          onClick={() => setNoticeExpanded(!noticeExpanded)}
          className="w-full px-4 py-2 flex items-center justify-between text-left hover:bg-[var(--table-hover)] transition-colors"
          aria-expanded={noticeExpanded}
          aria-label="Toggle Investigative Notice"
        >
          <div className="flex items-center gap-2 font-medium text-xs">
            <Info className="w-4 h-4 text-[var(--accent)] shrink-0" />
            <span className="font-semibold text-[var(--accent)]">Investigative Notice:</span>
            <span className="text-[var(--muted)] truncate">
              Shared technical identifiers indicate infrastructure correlation and syndicate patterns.
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-[var(--accent)] font-mono shrink-0 ml-2">
            <span>{noticeExpanded ? 'Collapse' : 'Expand'}</span>
            {noticeExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>

        {noticeExpanded && (
          <div className="px-4 pb-2.5 pt-1 border-t border-[var(--border)] text-[11px] text-[var(--muted)] leading-relaxed">
            Shared phone numbers, UPI identifiers, and Telegram contact handles establish shared infrastructure across accounts.
            In accordance with forensic review standards, automated clusters indicate coordinated threat activity but require formal confirmation prior to legal action.
          </div>
        )}
      </div>

      {/* 3. Controls Bar Above the Graph: Risk Chips, Platform Filter, Search */}
      <div className="p-2.5 rounded-[var(--radius)] bg-[var(--card)] border border-[var(--border)] flex flex-wrap items-center justify-between gap-2.5 shadow-2xs shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          {/* Risk Filter Chips */}
          <div className="flex items-center gap-1" role="group" aria-label="Risk Level Filter">
            <span className="text-[11px] font-mono text-[var(--muted)] mr-1">Risk:</span>
            {(['All', 'HIGH', 'MEDIUM', 'LOW'] as const).map((r) => {
              const active = riskFilter === r;
              return (
                <button
                  key={r}
                  onClick={() => setRiskFilter(r)}
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-[var(--radius)] border transition-all ${
                    active
                      ? 'bg-[var(--primary)] border-[var(--primary)] text-white font-bold shadow-2xs'
                      : 'bg-[#FFFFFF] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--table-hover)]'
                  }`}
                  aria-pressed={active}
                >
                  {r === 'All' ? 'All Risks' : r}
                </button>
              );
            })}
          </div>

          <span className="text-[var(--border)]">|</span>

          {/* Platform Filter Dropdown */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[11px] font-mono text-[var(--muted)]">Platform:</span>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="input-surface text-xs px-2 py-0.5 font-mono"
              aria-label="Platform Filter"
            >
              <option value="All">All Platforms</option>
              <option value="Telegram">Telegram</option>
              <option value="Instagram">Instagram</option>
              <option value="Facebook">Facebook</option>
              <option value="YouTube">YouTube</option>
              <option value="X">X (Twitter)</option>
              <option value="WhatsApp">WhatsApp</option>
            </select>
          </div>

          <span className="text-[var(--border)]">|</span>

          {/* Entity Type Filter Dropdown */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[11px] font-mono text-[var(--muted)]">Entity:</span>
            <select
              value={entityTypeFilter}
              onChange={(e) => setEntityTypeFilter(e.target.value as any)}
              className="input-surface text-xs px-2 py-0.5 font-mono"
              aria-label="Entity Filter"
            >
              <option value="All">All Entities</option>
              <option value="PHONE">Phones</option>
              <option value="UPI">UPI Handles</option>
              <option value="TELEGRAM">Telegram</option>
              <option value="URL">Domains/URLs</option>
              <option value="ad">Ads Only</option>
            </select>
          </div>

          <span className="text-[var(--border)]">|</span>

          {/* Counts Chip */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--muted)]">
            <span className="px-2 py-0.5 rounded bg-[var(--table-hover)] text-[var(--text)] font-semibold">
              {simNodes.length} nodes · {simLinks.length} edges
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#E8DDB8]/40 text-[#8C6D00] border border-[#D4AF37]/30 uppercase font-semibold">
              Live & Demo
            </span>
          </div>
        </div>

        {/* Search Input: phone, UPI, URL, ad ID */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[var(--muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search phone, UPI, URL, ad ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-surface w-full pl-8 pr-2.5 py-0.5 text-xs text-[var(--text)]"
            aria-label="Search identifier or advertisement"
          />
        </div>
      </div>

      {/* 4. Network Graph Canvas */}
      <div className="flex-1 relative gold-card p-0 overflow-hidden shadow-gold-sm border-[#E8DDB8] bg-[#FFFDF7]">
        {viewMode === '3d' ? (
          <div className="w-full h-full min-h-[550px] relative">
            <MuleNetwork3D
              data={networkData}
              isLoading={loading}
              height="100%"
              showHud={true}
              showControls={true}
              showDetailsPanel={true}
            />
          </div>
        ) : loading ? (
          <div className="h-full flex flex-col items-center justify-center text-xs font-mono text-[#697386] space-y-2">
            <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
            <p>Simulating Force-Directed Threat Network...</p>
          </div>
        ) : simNodes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
            <ShieldAlert className="w-10 h-10 text-[#8C97A8] mb-1" />
            <h3 className="text-sm font-semibold text-[#202124]">No Network Clusters Found</h3>
            <p className="text-xs text-[#697386] max-w-sm">
              No advertisements or identifier hubs match the active search and filter constraints.
            </p>
          </div>
        ) : (
          <svg
            ref={svgRef}
            className="w-full h-full cursor-grab active:cursor-grabbing select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            role="region"
            aria-label="Interactive Threat Network Graph"
          >
            {/* Background Dots Pattern */}
            <defs>
              <pattern id="network-grid-dots" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="#E8DDB8" opacity="0.6" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#network-grid-dots)" />

            {/* Transform Group for Pan & Zoom */}
            <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
              {/* Layer 1: Cluster Halos (soft dashed circles) */}
              {clusterHalos.map((halo) => (
                <g key={halo.id} className="pointer-events-none">
                  <circle
                    cx={halo.cx}
                    cy={halo.cy}
                    r={halo.radius}
                    fill="rgba(212, 175, 55, 0.03)"
                    stroke="#D4AF37"
                    strokeWidth="1.2"
                    strokeDasharray="5,5"
                    strokeOpacity="0.45"
                  />
                  {/* Monospace Hub Label sitting right above cluster halo */}
                  <text
                    x={halo.cx}
                    y={halo.cy - halo.radius - 8}
                    textAnchor="middle"
                    className="font-mono text-[11px] font-bold fill-[#202124] select-none"
                  >
                    {halo.label} ({halo.adCount} Ads)
                  </text>
                </g>
              ))}

              {/* Layer 2: Edges (thin 0.8px, semi-transparent) */}
              {simLinks.map((link) => {
                const source = link.source as GraphNode;
                const target = link.target as GraphNode;
                if (!source || !target || source.x === undefined || target.x === undefined) return null;

                const isConnectedToHovered =
                  hoveredNode && (source.id === hoveredNode.id || target.id === hoveredNode.id);
                const isConnectedToSelected =
                  selectedNode && (source.id === selectedNode.id || target.id === selectedNode.id);
                const isHighlight = isConnectedToHovered || isConnectedToSelected;

                const midX = (source.x! + target.x!) / 2;
                const midY = (source.y! + target.y!) / 2;

                return (
                  <g key={link.id}>
                    <line
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      stroke={isHighlight ? '#202124' : '#A67C00'}
                      strokeWidth={isHighlight ? 1.6 : 0.8}
                      strokeOpacity={
                        highlightedIds
                          ? isHighlight
                            ? 0.9
                            : 0.12
                          : 0.35
                      }
                      strokeDasharray={link.relationship === 'TEXT_SIMILARITY' ? '4,3' : undefined}
                    />

                    {/* Edge labels appear ONLY for hovered or selected node */}
                    {isHighlight && link.label && (
                      <g transform={`translate(${midX}, ${midY})`} className="pointer-events-none">
                        <rect
                          x={-((link.label.length * 6.5) / 2 + 6)}
                          y={-10}
                          width={link.label.length * 6.5 + 12}
                          height={20}
                          rx={4}
                          fill="#FFFDF7"
                          stroke="#E8DDB8"
                          strokeWidth={1}
                        />
                        <text
                          y={3.5}
                          textAnchor="middle"
                          className="font-mono text-[10px] font-semibold fill-[#202124]"
                        >
                          {link.label}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Layer 3: Nodes */}
              {simNodes.map((node) => {
                if (node.x === undefined || node.y === undefined) return null;

                const isHovered = hoveredNode?.id === node.id;
                const isSelected = selectedNode?.id === node.id;
                const isDimmed = highlightedIds !== null && !highlightedIds.has(node.id);

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    style={{
                      opacity: isDimmed ? 0.25 : 1,
                      transition: 'opacity 0.15s ease'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNode(node);
                    }}
                    onMouseEnter={(e) => {
                      setHoveredNode(node);
                      const rect = svgRef.current?.getBoundingClientRect();
                      if (rect) {
                        setTooltipPos({
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top
                        });
                      }
                    }}
                    onMouseLeave={() => {
                      setHoveredNode(null);
                      setTooltipPos(null);
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`${node.kind === 'hub' ? 'Identifier Hub' : 'Advertisement'} ${node.label}`}
                    className="cursor-pointer focus:outline-none"
                  >
                    {/* Identifier Hub: Rounded square in #22B8D4 */}
                    {node.kind === 'hub' && (
                      <g>
                        <rect
                          x={-16}
                          y={-16}
                          width={32}
                          height={32}
                          rx={8}
                          ry={8}
                          fill="#22B8D4"
                          stroke={isSelected ? '#6366F1' : '#0E7490'}
                          strokeWidth={isSelected ? 3 : 1.5}
                        />
                        <g transform="translate(-7, -7)">
                          {renderHubIcon(node.hubType)}
                        </g>
                      </g>
                    )}

                    {/* Advertisement Node: Small circle with size = risk score */}
                    {node.kind === 'ad' && (
                      <g>
                        {/* Extra dashed red ring for bridge ads (connected to 2+ hubs) */}
                        {node.isBridge && (
                          <circle
                            r={node.radius + 4}
                            fill="none"
                            stroke="#E24B4A"
                            strokeWidth={1.8}
                            strokeDasharray="3,3"
                          />
                        )}

                        {/* Selected 3px ring in #6366F1 */}
                        {isSelected && (
                          <circle
                            r={node.radius + (node.isBridge ? 7 : 3)}
                            fill="none"
                            stroke="#6366F1"
                            strokeWidth={3}
                          />
                        )}

                        {/* Main ad circle with risk score fill */}
                        <circle
                          r={node.radius}
                          fill={getAdColor(node.riskLevel)}
                          stroke="#FFFFFF"
                          strokeWidth={1.5}
                        />

                        {/* Text label inside node if size permits */}
                        {node.radius >= 13 && (
                          <text
                            textAnchor="middle"
                            dy="3.5"
                            className="font-mono text-[9px] font-bold fill-white select-none pointer-events-none"
                          >
                            {Math.round(node.riskScore || 0)}
                          </text>
                        )}
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        )}

        {/* Hover Tooltip (Ad ID and Score) */}
        {hoveredNode && tooltipPos && (
          <div
            className="absolute z-30 pointer-events-none rounded-lg bg-[#FFFFFF] border border-[#E8DDB8] p-2.5 shadow-gold-md text-xs font-mono space-y-1"
            style={{
              left: Math.min(window.innerWidth - 220, tooltipPos.x + 14),
              top: Math.max(10, tooltipPos.y - 45)
            }}
          >
            {hoveredNode.kind === 'ad' ? (
              <>
                <div className="flex items-center gap-1.5 font-bold text-[#202124]">
                  <span>{hoveredNode.label}</span>
                  <span
                    className="px-1.5 py-0.2 rounded text-[10px] text-white"
                    style={{ backgroundColor: getAdColor(hoveredNode.riskLevel) }}
                  >
                    {hoveredNode.riskLevel}
                  </span>
                </div>
                <div className="text-[11px] text-[#697386]">
                  Risk Score: <strong className="text-[#202124]">{Math.round(hoveredNode.riskScore || 0)}/100</strong>
                </div>
                <div className="text-[10px] text-[#8C97A8]">
                  Platform: {hoveredNode.platform || 'Unknown'}
                  {hoveredNode.isBridge && ' • Bridge Ad (2+ Hubs)'}
                </div>
              </>
            ) : (
              <>
                <div className="font-bold text-[#202124] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#22B8D4]" />
                  <span>{hoveredNode.label}</span>
                </div>
                <div className="text-[11px] text-[#697386]">
                  Cluster Identifier • {hoveredNode.metadata?.totalAds || 0} Connected Ads
                </div>
              </>
            )}
          </div>
        )}

        {/* Floating Detail Panel (Right Sidebar on Node Click) */}
        {selectedNode && (
          <div className="absolute top-4 right-4 w-88 max-w-[90vw] max-h-[90%] overflow-y-auto rounded-xl bg-[#FFFFFF] border border-[#E8DDB8] p-5 shadow-gold-lg z-30 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8DDB8] pb-3">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] font-mono text-[#8C97A8] uppercase tracking-wider block">
                  {selectedNode.kind === 'hub' ? 'Cluster Hub Summary' : 'Advertisement Details'}
                </span>
                <span className="text-sm font-bold text-[#202124] truncate block">
                  {selectedNode.label}
                </span>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded-lg text-[#697386] hover:text-[#202124] hover:bg-[#FAF9F6] transition-colors"
                title="Close panel"
                aria-label="Close detail panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* AD DETAILS VIEW */}
            {selectedNode.kind === 'ad' && (
              <div className="space-y-3.5 text-xs">
                {/* Risk & Platform Row */}
                <div className="flex items-center justify-between">
                  <span className="text-[#697386]">Risk Assessment:</span>
                  <RiskBadge level={selectedNode.riskLevel} score={selectedNode.riskScore} size="sm" />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#697386]">Detected Platform:</span>
                  <span className="font-semibold text-[#202124]">{selectedNode.platform}</span>
                </div>

                {selectedNode.isBridge && (
                  <div className="p-2.5 rounded-lg bg-[rgba(200,61,77,0.08)] border border-[rgba(200,61,77,0.25)] text-[#C83D4D] text-[11px]">
                    <strong>Bridge Node Alert:</strong> This advertisement links multiple syndicate hubs ({selectedNode.connectedHubCount} hubs), serving as a cross-channel pivot point.
                  </div>
                )}

                {/* Shared Identifiers */}
                <div>
                  <span className="text-[#697386] block mb-1 font-mono text-[11px]">Shared Identifiers:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedNode.metadata?.entities || []).length > 0 ? (
                      selectedNode.metadata.entities.map((ent: any, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-[#FAF9F6] border border-[#E8DDB8] text-[10px] font-mono text-[#202124]"
                        >
                          {ent.type}: {ent.value}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-[#8C97A8] italic">No unique identifiers extracted</span>
                    )}
                  </div>
                </div>

                {/* Matched Phrases */}
                <div>
                  <span className="text-[#697386] block mb-1 font-mono text-[11px]">Matched Suspicious Phrases:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedNode.metadata?.matched_phrases || []).length > 0 ? (
                      selectedNode.metadata.matched_phrases.map((phrase: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-[rgba(196,123,22,0.08)] text-[#C47B16] border border-[rgba(196,123,22,0.25)] text-[10px] font-mono"
                        >
                          "{phrase}"
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-[#8C97A8] italic">Pattern based correlation</span>
                    )}
                  </div>
                </div>

                {/* Post Preview Snippet */}
                {selectedNode.metadata?.preview && (
                  <div>
                    <span className="text-[#697386] block mb-1 font-mono text-[11px]">Content Preview:</span>
                    <p className="p-2.5 rounded-lg bg-[#FAF9F6] border border-[#E8DDB8] text-[11px] text-[#202124] leading-relaxed">
                      {selectedNode.metadata.preview}
                    </p>
                  </div>
                )}

                {pdfNotice && (
                  <div className="p-2.5 rounded-lg bg-[rgba(35,134,91,0.08)] border border-[rgba(35,134,91,0.25)] text-[#23865B] text-[11px] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{pdfNotice}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 space-y-2 border-t border-[#E8DDB8]">
                  <button
                    onClick={handleGeneratePdf}
                    disabled={pdfGenerating}
                    className="btn-gold w-full py-2 text-xs flex items-center justify-center gap-2"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>{pdfGenerating ? 'Generating PDF...' : 'Generate Case Report'}</span>
                  </button>

                  {selectedNode.metadata?.db_id && (
                    <Link
                      to={`/investigations/${selectedNode.metadata.db_id}`}
                      className="btn-gold-secondary w-full py-2 text-xs flex items-center justify-center gap-1.5 no-underline"
                    >
                      <span>Open Full Dossier</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* HUB SUMMARY VIEW */}
            {selectedNode.kind === 'hub' && (
              <div className="space-y-3.5 text-xs">
                <div className="p-3 rounded-lg bg-[#FAF9F6] border border-[#E8DDB8] space-y-1.5">
                  <div className="flex items-center justify-between text-[#697386]">
                    <span>Hub Identifier Type:</span>
                    <strong className="text-[#202124]">{selectedNode.hubType}</strong>
                  </div>
                  <div className="flex items-center justify-between text-[#697386]">
                    <span>Canonical Value:</span>
                    <span className="font-mono text-[#A67C00] font-bold">{selectedNode.hubValue}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#697386]">
                    <span>Total Linked Advertisements:</span>
                    <span className="font-mono text-[#202124] font-bold">
                      {selectedNode.metadata?.totalAds || 0} ads
                    </span>
                  </div>
                </div>

                {/* List of linked ad IDs */}
                <div>
                  <span className="text-[#697386] block mb-1 font-mono text-[11px]">Associated Ads in Cluster:</span>
                  <div className="max-h-40 overflow-y-auto space-y-1 p-2 rounded-lg bg-[#FAF9F6] border border-[#E8DDB8]">
                    {Array.from(selectedNode.metadata?.adIds || []).map((adId: any) => (
                      <div
                        key={adId}
                        onClick={() => {
                          const target = simNodes.find((n) => n.id === adId);
                          if (target) setSelectedNode(target);
                        }}
                        className="p-1.5 rounded hover:bg-[#FFFFFF] cursor-pointer flex items-center justify-between text-[11px] font-mono border border-transparent hover:border-[#E8DDB8] transition-colors"
                      >
                        <span className="font-semibold text-[#202124]">{adId}</span>
                        <span className="text-[#A67C00] text-[10px]">Inspect ↗</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Small Legend Row Below the Graph */}
      <div className="px-3.5 py-2 rounded-[var(--radius)] bg-[var(--card)] border border-[var(--border)] shadow-2xs flex flex-wrap items-center justify-between gap-3 text-[11px] text-[var(--muted)] shrink-0 select-none font-mono">
        <span className="font-bold text-[var(--text)] uppercase tracking-wider">Legend:</span>

        <div className="flex flex-wrap items-center gap-3.5">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-sm bg-[#22B8D4] border border-[#0E7490] inline-block" />
            <span>Identifier Hub</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#E5484D] inline-block" />
            <span>High Risk</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#F5A524] inline-block" />
            <span>Medium Risk</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#2FA97C] inline-block" />
            <span>Low Risk</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full border-2 border-dashed border-[#E5484D] inline-flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E5484D]" />
            </span>
            <span>Bridge Ad (2+ Hubs)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full border border-dashed border-[var(--accent)] inline-block opacity-75" />
            <span>Cluster Halo</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full ring-2 ring-[#6366F1] bg-[#2FA97C] inline-block" />
            <span>Selected Ad</span>
          </div>
        </div>
      </div>
    </div>
  );
};
