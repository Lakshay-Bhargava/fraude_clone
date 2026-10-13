import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  MarkerType,
  Node,
  Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Link } from 'react-router-dom';
import {
  Network,
  RefreshCw,
  Info,
  ExternalLink,
  X,
  ShieldAlert,
  ArrowRight,
  Search,
  Filter,
  Eye,
  CreditCard,
  Phone,
  Maximize2
} from 'lucide-react';
import { api } from '../services/api';
import { ThreatNetworkData, NetworkNode } from '../types';
import { RiskBadge } from '../components/ui/RiskBadge';

export const ThreatNetworkPage: React.FC = () => {
  const [networkData, setNetworkData] = useState<ThreatNetworkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);

  // Search and Filter controls
  const [searchIdentifier, setSearchIdentifier] = useState('');
  const [riskFilter, setRiskFilter] = useState('All');
  const [platformFilter, setPlatformFilter] = useState('All');

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const fetchNetwork = async () => {
    try {
      setLoading(true);
      const data = await api.getThreatNetwork();
      setNetworkData(data);
    } catch (err) {
      console.error('Failed to load threat network graph', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNetwork();
  }, []);

  // Compute Layout when networkData or filters change
  useEffect(() => {
    if (!networkData) return;

    let filteredNodes = networkData.nodes;

    if (riskFilter !== 'All') {
      filteredNodes = filteredNodes.filter(n => n.risk_level === riskFilter || n.node_type.startsWith('entity_'));
    }

    if (searchIdentifier.trim()) {
      const q = searchIdentifier.trim().toLowerCase();
      filteredNodes = filteredNodes.filter(n => n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q));
    }

    const nTotal = filteredNodes.length;
    const radius = 280;
    const centerX = 420;
    const centerY = 300;

    const flowNodes: Node[] = filteredNodes.map((n, i) => {
      let x = 0;
      let y = 0;

      if (n.node_type === 'case') {
        x = centerX + (i % 2 === 0 ? -120 : 120);
        y = centerY;
      } else if (n.node_type.startsWith('entity_')) {
        const angle = (i / Math.max(nTotal, 1)) * 2 * Math.PI;
        x = centerX + Math.cos(angle) * (radius * 0.55);
        y = centerY + Math.sin(angle) * (radius * 0.55);
      } else {
        const angle = (i / Math.max(nTotal, 1)) * 2 * Math.PI;
        x = centerX + Math.cos(angle) * radius;
        y = centerY + Math.sin(angle) * radius;
      }

      // Visual Design:
      // High-risk: red (#EF4444)
      // Medium-risk: amber (#F59E0B)
      // Low-risk: green (#10B981)
      // Identifier: cyan (#22D3EE)
      // Selected: indigo (#6366F1)
      const isSelected = selectedNode?.id === n.id;
      let borderCol = 'rgba(148, 163, 184, 0.25)';
      let bgCol = '#131C2E';
      let textCol = '#E5E9F2';

      if (isSelected) {
        borderCol = '#6366F1';
        bgCol = '#18243A';
      } else if (n.node_type === 'ad') {
        if (n.risk_level === 'HIGH') {
          borderCol = '#EF4444';
          bgCol = '#1E1218';
        } else if (n.risk_level === 'MEDIUM') {
          borderCol = '#F59E0B';
          bgCol = '#1E1A12';
        } else {
          borderCol = '#10B981';
          bgCol = '#0E1F18';
        }
      } else if (n.node_type.startsWith('entity_') || n.node_type.includes('phone') || n.node_type.includes('upi') || n.node_type.includes('telegram')) {
        borderCol = '#22D3EE';
        bgCol = '#0C1C29';
      }

      return {
        id: n.id,
        position: { x, y },
        data: { ...n, label: n.label },
        style: {
          background: bgCol,
          color: textCol,
          border: `1.5px solid ${borderCol}`,
          borderRadius: n.node_type === 'case' ? '12px' : '20px',
          padding: '8px 14px',
          fontSize: '11px',
          fontFamily: 'Inter, sans-serif',
          boxShadow: isSelected ? '0 0 20px rgba(99,102,241,0.5)' : '0 8px 20px rgba(0,0,0,0.4)',
          cursor: 'pointer',
        },
      };
    });

    const activeNodeIds = new Set(filteredNodes.map(n => n.id));
    const flowEdges: Edge[] = networkData.edges
      .filter(e => activeNodeIds.has(e.source) && activeNodeIds.has(e.target))
      .map((e) => {
        let strokeCol = 'rgba(148, 163, 184, 0.25)';
        if (e.relationship === 'LINKED_CASE') strokeCol = '#6366F1';
        if (e.relationship.includes('TELEGRAM')) strokeCol = '#22D3EE';
        if (e.relationship.includes('PHONE') || e.relationship.includes('UPI')) strokeCol = '#22D3EE';
        if (e.relationship.includes('DOMAIN')) strokeCol = '#818CF8';
        if (e.relationship === 'TEXT_SIMILARITY') strokeCol = '#F59E0B';

        return {
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label,
          type: 'default',
          animated: e.relationship === 'LINKED_CASE' || e.relationship.includes('TELEGRAM'),
          style: { stroke: strokeCol, strokeWidth: 1.5 },
          labelStyle: { fill: '#94A3B8', fontSize: 10, fontFamily: 'Inter, sans-serif' },
          labelBgStyle: { fill: '#0E1728', fillOpacity: 0.9 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: strokeCol,
            width: 12,
            height: 12,
          },
        };
      });

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [networkData, selectedNode, riskFilter, searchIdentifier]);

  const onNodeClick = useCallback(
    (_: any, node: Node) => {
      if (networkData) {
        const found = networkData.nodes.find((n) => n.id === node.id);
        if (found) setSelectedNode(found);
      }
    },
    [networkData]
  );

  return (
    <div className="space-y-4 h-[calc(100vh-8.5rem)] flex flex-col max-w-7xl mx-auto">
      {/* 1. Header with Search and Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Clusters / Networks</h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#22D3EE]/15 border border-[#22D3EE]/30 text-[#22D3EE] font-semibold">
              Threat Intelligence
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Visualize relationships between advertisements, phone numbers, UPI IDs, URLs, and social accounts.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search by Identifier */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search identifier, phone, UPI..."
              value={searchIdentifier}
              onChange={(e) => setSearchIdentifier(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-[#0D182B] border border-[rgba(148,163,184,0.15)] rounded-lg text-[#E5E9F2] placeholder-[#64748B] focus:outline-none focus:border-[#6366F1]"
            />
            <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* Risk Level Filter */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="py-1.5 px-2.5 text-xs bg-[#0D182B] border border-[rgba(148,163,184,0.15)] rounded-lg text-[#94A3B8] focus:outline-none focus:border-[#6366F1]"
          >
            <option value="All">All Risk Levels</option>
            <option value="HIGH">High Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="LOW">Low Risk</option>
          </select>

          <button
            onClick={fetchNetwork}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
            title="Reset graph layout"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#6366F1]' : ''}`} />
            <span>Reset Layout</span>
          </button>
        </div>
      </div>

      {/* 2. Clear Disclaimer Notice */}
      <div className="p-3 rounded-xl bg-[#0E1728] border border-[rgba(148,163,184,0.15)] text-xs text-[#94A3B8] flex items-center gap-2 shrink-0">
        <Info className="w-4 h-4 text-[#22D3EE] shrink-0" />
        <span>
          <strong>Investigative Notice:</strong> Shared identifiers (phone numbers, UPI IDs, URLs) suggest a relationship or common infrastructure but do not, by themselves, prove common ownership or criminal activity.
        </span>
      </div>

      {/* 3. React Flow Graph Canvas */}
      <div className="flex-1 relative floating-card p-0 overflow-hidden shadow-2xl">
        {loading ? (
          <div className="h-full flex items-center justify-center text-xs font-mono text-[#64748B] space-y-2">
            <div className="w-6 h-6 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p>Rendering threat intelligence network...</p>
          </div>
        ) : nodes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
            <Network className="w-10 h-10 text-[#64748B] mb-2" />
            <h3 className="text-sm font-semibold text-white">No relationships found</h3>
            <p className="text-xs text-[#94A3B8] max-w-sm">
              No nodes match the selected search query or risk filters. Try clearing the filter parameters.
            </p>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            fitView
            minZoom={0.2}
            maxZoom={2.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#18243A" gap={20} variant={BackgroundVariant.Dots} />
            <Controls className="!bg-[#131C2E] !border-[rgba(148,163,184,0.2)] !text-white fill-white rounded-xl" />
          </ReactFlow>
        )}

        {/* Floating Legend */}
        <div className="absolute top-4 left-4 p-4 rounded-xl bg-[#091426]/95 backdrop-blur-md border border-[rgba(148,163,184,0.15)] text-xs text-[#94A3B8] space-y-2 z-10 pointer-events-none select-none max-w-xs shadow-xl">
          <div className="font-bold text-white text-xs mb-1">Graph Legend</div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full border border-[#EF4444] bg-[#EF4444]" />
            <span>High-Risk Advertisement</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full border border-[#F59E0B] bg-[#F59E0B]" />
            <span>Medium-Risk Advertisement</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full border border-[#10B981] bg-[#10B981]" />
            <span>Low-Risk Advertisement</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full border border-[#22D3EE] bg-[#22D3EE]" />
            <span>Identifier Node (Phone / UPI / URL)</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-sm border border-[#6366F1] bg-[#6366F1]" />
            <span>Selected Active Node</span>
          </div>
        </div>

        {/* Floating Node Inspector Drawer */}
        {selectedNode && (
          <div className="absolute top-4 right-4 w-84 floating-card-elevated p-5 z-20 shadow-2xl space-y-3.5 border-[rgba(148,163,184,0.2)] max-h-[90%] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.1)] pb-2.5">
              <div>
                <span className="text-[10px] font-mono text-[#64748B] uppercase block">Node Inspector</span>
                <span className="text-sm font-bold text-white">{selectedNode.label}</span>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#131C2E] transition-colors"
                title="Close Inspector"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span>Node Type:</span>
                <span className="text-white font-medium capitalize">
                  {selectedNode.node_type.replace('entity_', 'Identifier: ')}
                </span>
              </div>

              {selectedNode.risk_level && (
                <div className="flex items-center justify-between">
                  <span className="text-[#94A3B8]">Risk Assessment:</span>
                  <RiskBadge level={selectedNode.risk_level} score={selectedNode.risk_score} size="sm" />
                </div>
              )}

              {selectedNode.metadata?.preview && (
                <div className="pt-1">
                  <span className="text-[#94A3B8] block mb-1">Post Preview:</span>
                  <p className="p-3 rounded-xl bg-[#0D182B] border border-[rgba(148,163,184,0.1)] text-xs text-[#E5E9F2] leading-relaxed">
                    {selectedNode.metadata.preview}
                  </p>
                </div>
              )}

              {selectedNode.metadata?.connected_ads !== undefined && (
                <div className="p-3 rounded-xl bg-[#0D182B] border border-[rgba(148,163,184,0.1)] flex items-center justify-between text-[#94A3B8]">
                  <span>Connected Advertisements:</span>
                  <span className="text-[#22D3EE] font-bold font-mono">
                    {selectedNode.metadata.connected_ads} linked ads
                  </span>
                </div>
              )}
            </div>

            <div className="p-2.5 rounded-lg bg-[#0D182B]/80 border border-[rgba(148,163,184,0.1)] text-[11px] text-[#64748B] leading-relaxed">
              Shared technical identifiers suggest a relationship but do not establish direct ownership.
            </div>

            {selectedNode.metadata?.db_id && selectedNode.node_type === 'ad' && (
              <div className="pt-2 border-t border-[rgba(148,163,184,0.1)]">
                <Link
                  to={`/investigations/${selectedNode.metadata.db_id}`}
                  className="btn-primary text-xs py-2 px-4 w-full flex items-center justify-center gap-1.5"
                >
                  <span>Open Full Investigation Dossier</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
