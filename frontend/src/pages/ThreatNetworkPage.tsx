import React, { useState, useEffect, useCallback } from 'react';
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
  Layers,
  Phone,
  MessageSquare,
  Globe,
  Briefcase,
  AlertTriangle,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { ThreatNetworkData, NetworkNode } from '../types';
import { RiskBadge } from '../components/ui/RiskBadge';

export const ThreatNetworkPage: React.FC = () => {
  const [networkData, setNetworkData] = useState<ThreatNetworkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Edge type filter
  const [edgeFilter, setEdgeFilter] = useState<string>('ALL');

  const fetchNetwork = async () => {
    try {
      setLoading(true);
      const data = await api.getThreatNetwork();
      setNetworkData(data);

      // Compute circular or grid layout coordinates for nodes
      const nTotal = data.nodes.length;
      const radius = 280;
      const centerX = 400;
      const centerY = 300;

      const flowNodes: Node[] = data.nodes.map((n, i) => {
        let x = 0;
        let y = 0;

        if (n.node_type === 'case') {
          // Place cases in center
          x = centerX + (i % 2 === 0 ? -120 : 120);
          y = centerY;
        } else if (n.node_type.startsWith('entity_')) {
          // Place entities in inner ring
          const angle = (i / nTotal) * 2 * Math.PI;
          x = centerX + Math.cos(angle) * (radius * 0.55);
          y = centerY + Math.sin(angle) * (radius * 0.55);
        } else {
          // Place ads in outer ring
          const angle = (i / nTotal) * 2 * Math.PI;
          x = centerX + Math.cos(angle) * radius;
          y = centerY + Math.sin(angle) * radius;
        }

        // Color & border styling by node type
        let borderCol = 'rgba(255,255,255,0.2)';
        let bgCol = '#171A22';
        let textCol = '#F5F5F7';

        if (n.node_type === 'case') {
          borderCol = '#FF7547';
          bgCol = '#251710';
        } else if (n.node_type === 'ad') {
          if (n.risk_level === 'HIGH') {
            borderCol = '#FF4D5A';
          } else if (n.risk_level === 'MEDIUM') {
            borderCol = '#F3B84B';
          } else {
            borderCol = '#49D6A5';
          }
        } else if (n.node_type.includes('telegram')) {
          borderCol = '#38bdf8';
          bgCol = '#0c1a24';
        } else if (n.node_type.includes('phone') || n.node_type.includes('whatsapp')) {
          borderCol = '#4ade80';
          bgCol = '#0d2216';
        } else if (n.node_type.includes('url')) {
          borderCol = '#a855f7';
          bgCol = '#1b1026';
        }

        return {
          id: n.id,
          position: { x, y },
          data: { ...n, label: n.label },
          style: {
            background: bgCol,
            color: textCol,
            border: `1.5px solid ${borderCol}`,
            borderRadius: n.node_type === 'case' ? '8px' : '24px',
            padding: '8px 14px',
            fontSize: '11px',
            fontFamily: 'JetBrains Mono',
            boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
            cursor: 'pointer',
          },
        };
      });

      const flowEdges: Edge[] = data.edges.map((e) => {
        let strokeCol = 'rgba(255,255,255,0.2)';
        if (e.relationship === 'LINKED_CASE') strokeCol = '#FF7547';
        if (e.relationship.includes('TELEGRAM')) strokeCol = '#38bdf8';
        if (e.relationship.includes('PHONE')) strokeCol = '#4ade80';
        if (e.relationship.includes('DOMAIN')) strokeCol = '#a855f7';
        if (e.relationship === 'TEXT_SIMILARITY') strokeCol = '#F3B84B';

        return {
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label,
          type: 'default',
          animated: e.relationship === 'LINKED_CASE' || e.relationship.includes('TELEGRAM'),
          style: { stroke: strokeCol, strokeWidth: 1.5 },
          labelStyle: { fill: '#9297A4', fontSize: 9, fontFamily: 'JetBrains Mono' },
          labelBgStyle: { fill: '#101218', fillOpacity: 0.8 },
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
    } catch (err) {
      console.error('Failed to load threat network graph', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNetwork();
  }, []);

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
    <div className="space-y-4 h-[calc(100vh-8.5rem)] flex flex-col">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-xl font-bold font-display text-white">Interactive Threat Network</h2>
          <p className="text-xs font-mono text-[#9297A4]">
            Graph correlation of financial ads, syndicated cases, shared Telegram handles, and near-duplicate text
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchNetwork}
            className="px-3 py-1.5 rounded bg-[#171A22] border border-white/10 text-xs font-mono text-[#9297A4] hover:text-white flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#FF7547]' : ''}`} />
            <span>Reset Layout</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative bg-[#101218] border border-white/[0.08] rounded-xl overflow-hidden">
        {loading ? (
          <div className="h-full flex items-center justify-center font-mono text-xs text-[#9297A4]">
            Rendering forensic graph nodes...
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
            <Background color="#1f232e" gap={24} variant={BackgroundVariant.Dots} />
            <Controls className="!bg-[#171A22] !border-white/10 !text-white fill-white" />
          </ReactFlow>
        )}

        {/* Legend Overlay Box */}
        <div className="absolute top-4 left-4 p-3 rounded-lg bg-[#08090D]/90 backdrop-blur-md border border-white/10 text-[10px] font-mono text-[#9297A4] space-y-1.5 z-10 pointer-events-none select-none max-w-xs">
          <div className="font-bold text-white uppercase text-[11px] mb-1">Graph Legend</div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full border border-[#FF4D5A] bg-[#FF4D5A]/30" />
            <span>Advertisement Record (High Risk)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm border border-[#FF7547] bg-[#FF7547]/30" />
            <span>Active Investigation Case</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full border border-[#38bdf8] bg-[#38bdf8]/30" />
            <span>Shared Telegram Handle</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full border border-[#4ade80] bg-[#4ade80]/30" />
            <span>Shared Phone / WhatsApp</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full border border-[#a855f7] bg-[#a855f7]/30" />
            <span>Shared Destination Domain</span>
          </div>
        </div>

        {/* Selected Node Details Drawer */}
        {selectedNode && (
          <div className="absolute top-4 right-4 w-80 max-w-sm bg-[#171A22]/95 backdrop-blur-md border border-white/10 rounded-xl p-4 z-20 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-mono font-bold text-white">{selectedNode.label}</span>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-[#9297A4] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-[#9297A4]">
                <span>NODE TYPE:</span>
                <span className="text-white uppercase">{selectedNode.node_type}</span>
              </div>

              {selectedNode.risk_level && (
                <div className="flex items-center justify-between">
                  <span className="text-[#9297A4]">RISK LEVEL:</span>
                  <RiskBadge level={selectedNode.risk_level} score={selectedNode.risk_score} size="sm" />
                </div>
              )}

              {selectedNode.metadata?.preview && (
                <div>
                  <span className="text-[#9297A4] block mb-1">CONTENT PREVIEW:</span>
                  <p className="p-2 rounded bg-[#08090D] border border-white/5 text-[11px] text-white">
                    {selectedNode.metadata.preview}
                  </p>
                </div>
              )}

              {selectedNode.metadata?.title && (
                <div>
                  <span className="text-[#9297A4] block mb-1">CASE TITLE:</span>
                  <p className="text-white font-sans">{selectedNode.metadata.title}</p>
                </div>
              )}

              {selectedNode.metadata?.connected_ads !== undefined && (
                <div className="flex items-center justify-between text-[#9297A4]">
                  <span>LINKED ADS:</span>
                  <span className="text-[#49D6A5] font-bold">{selectedNode.metadata.connected_ads}</span>
                </div>
              )}
            </div>

            {selectedNode.metadata?.db_id && selectedNode.node_type === 'ad' && (
              <div className="pt-2 border-t border-white/10">
                <Link
                  to={`/investigations/${selectedNode.metadata.db_id}`}
                  className="w-full py-1.5 rounded bg-[#FF7547] text-white text-xs font-mono font-semibold flex items-center justify-center gap-1.5 hover:bg-[#FF8A65]"
                >
                  <span>Open Evidence Record</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Forensic Disclaimer */}
      <div className="text-[11px] font-mono text-[#626775] text-center shrink-0">
        Note: Network graph links represent shared technical features, contact handles, or textual similarities. They do not constitute legal proof of coordination.
      </div>
    </div>
  );
};
