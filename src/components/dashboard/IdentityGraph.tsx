import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  User,
  Smartphone,
  Monitor,
  AlertTriangle,
  ShieldCheck,
  Fingerprint,
  Globe,
  Mail,
  Phone,
  MapPin,
  CreditCard,
} from "lucide-react";

export type NodeType = "user" | "device" | "email" | "phone" | "ip" | "location" | "payment" | "fraud_signal";

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  x: number;
  y: number;
  trustScore?: number;
  detail?: string;
  flagged?: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
  label?: string;
  strength: number; // 0-1
  suspicious?: boolean;
}

const nodeConfig: Record<NodeType, { icon: React.ElementType; color: string; bg: string }> = {
  user: { icon: User, color: "hsl(187, 92%, 52%)", bg: "hsl(187, 92%, 52%)" },
  device: { icon: Smartphone, color: "hsl(265, 85%, 60%)", bg: "hsl(265, 85%, 60%)" },
  email: { icon: Mail, color: "hsl(160, 84%, 39%)", bg: "hsl(160, 84%, 39%)" },
  phone: { icon: Phone, color: "hsl(200, 90%, 55%)", bg: "hsl(200, 90%, 55%)" },
  ip: { icon: Globe, color: "hsl(38, 92%, 50%)", bg: "hsl(38, 92%, 50%)" },
  location: { icon: MapPin, color: "hsl(215, 20%, 55%)", bg: "hsl(215, 20%, 55%)" },
  payment: { icon: CreditCard, color: "hsl(187, 92%, 52%)", bg: "hsl(187, 92%, 52%)" },
  fraud_signal: { icon: AlertTriangle, color: "hsl(350, 89%, 60%)", bg: "hsl(350, 89%, 60%)" },
};

const sampleNodes: GraphNode[] = [
  { id: "u1", label: "John M.", type: "user", x: 400, y: 300, trustScore: 923, detail: "KYC Verified" },
  { id: "u2", label: "Grace W.", type: "user", x: 700, y: 200, trustScore: 871, detail: "KYC Verified" },
  { id: "u3", label: "Unknown", type: "user", x: 650, y: 500, trustScore: 89, detail: "Rejected", flagged: true },
  { id: "d1", label: "iPhone 15", type: "device", x: 200, y: 180 },
  { id: "d2", label: "MacBook Pro", type: "device", x: 250, y: 420 },
  { id: "d3", label: "Pixel 8", type: "device", x: 850, y: 350, detail: "Rooted device" },
  { id: "e1", label: "john@email.com", type: "email", x: 150, y: 300 },
  { id: "e2", label: "grace@work.com", type: "email", x: 900, y: 120 },
  { id: "e3", label: "temp@mail.xyz", type: "email", x: 500, y: 550, detail: "Disposable email", flagged: true },
  { id: "ip1", label: "192.168.1.x", type: "ip", x: 350, y: 100 },
  { id: "ip2", label: "10.0.0.x", type: "ip", x: 800, y: 480, detail: "VPN detected", flagged: true },
  { id: "loc1", label: "New York, US", type: "location", x: 500, y: 150 },
  { id: "loc2", label: "Lagos, NG", type: "location", x: 550, y: 420 },
  { id: "pay1", label: "Visa •••4821", type: "payment", x: 300, y: 500 },
  { id: "f1", label: "Velocity Alert", type: "fraud_signal", x: 750, y: 600, detail: "5 attempts in 2 min", flagged: true },
  { id: "f2", label: "Device Spoof", type: "fraud_signal", x: 950, y: 500, detail: "Emulator detected", flagged: true },
];

const sampleEdges: GraphEdge[] = [
  { source: "u1", target: "d1", strength: 0.9, label: "Primary" },
  { source: "u1", target: "d2", strength: 0.8, label: "Secondary" },
  { source: "u1", target: "e1", strength: 1.0 },
  { source: "u1", target: "ip1", strength: 0.7 },
  { source: "u1", target: "loc1", strength: 0.9 },
  { source: "u1", target: "pay1", strength: 0.85 },
  { source: "u2", target: "e2", strength: 1.0 },
  { source: "u2", target: "ip1", strength: 0.6, label: "Shared IP" },
  { source: "u2", target: "loc1", strength: 0.8 },
  { source: "u2", target: "d3", strength: 0.4, suspicious: true },
  { source: "u3", target: "d3", strength: 0.7, suspicious: true },
  { source: "u3", target: "e3", strength: 0.9, suspicious: true },
  { source: "u3", target: "ip2", strength: 0.8, suspicious: true },
  { source: "u3", target: "loc2", strength: 0.6 },
  { source: "u3", target: "f1", strength: 1.0, suspicious: true },
  { source: "u3", target: "f2", strength: 1.0, suspicious: true },
  { source: "d3", target: "f2", strength: 0.9, suspicious: true },
  { source: "e3", target: "f1", strength: 0.7, suspicious: true },
  { source: "ip2", target: "f1", strength: 0.5, suspicious: true },
];

interface Props {
  nodes?: GraphNode[];
  edges?: GraphEdge[];
}

const IdentityGraph = ({ nodes = sampleNodes, edges = sampleEdges }: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [dragNode, setDragNode] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(() => {
    const pos: Record<string, { x: number; y: number }> = {};
    nodes.forEach((n) => (pos[n.id] = { x: n.x, y: n.y }));
    return pos;
  });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });

  const getPos = (id: string) => positions[id] || { x: 0, y: 0 };

  const handleMouseDown = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setDragNode(nodeId);
    },
    []
  );

  const handleSvgMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (dragNode) return;
      isPanning.current = true;
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    },
    [dragNode, pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (dragNode) {
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const x = (e.clientX - rect.left - pan.x) / zoom;
        const y = (e.clientY - rect.top - pan.y) / zoom;
        setPositions((prev) => ({ ...prev, [dragNode]: { x, y } }));
      } else if (isPanning.current) {
        setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
      }
    },
    [dragNode, zoom, pan]
  );

  const handleMouseUp = useCallback(() => {
    setDragNode(null);
    isPanning.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.3, Math.min(2.5, z - e.deltaY * 0.001)));
  }, []);

  const connectedNodeIds = selectedNode
    ? new Set(
        edges
          .filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
          .flatMap((e) => [e.source, e.target])
      )
    : null;

  const NodeIcon = ({ node }: { node: GraphNode }) => {
    const config = nodeConfig[node.type];
    const Icon = config.icon;
    return <Icon className="w-4 h-4" style={{ color: "#fff" }} />;
  };

  return (
    <div className="relative w-full h-full overflow-hidden rounded-xl">
      <svg
        ref={svgRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleSvgMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-red">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Grid */}
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="hsl(222, 20%, 14%)" strokeWidth="0.5" />
          </pattern>
          <rect x="-2000" y="-2000" width="5000" height="5000" fill="url(#grid)" />

          {/* Edges */}
          {edges.map((edge, i) => {
            const s = getPos(edge.source);
            const t = getPos(edge.target);
            const dimmed =
              connectedNodeIds &&
              !(connectedNodeIds.has(edge.source) && connectedNodeIds.has(edge.target));
            const midX = (s.x + t.x) / 2;
            const midY = (s.y + t.y) / 2;

            return (
              <g key={`edge-${i}`} opacity={dimmed ? 0.1 : 1}>
                <line
                  x1={s.x}
                  y1={s.y}
                  x2={t.x}
                  y2={t.y}
                  stroke={edge.suspicious ? "hsl(350, 89%, 60%)" : "hsl(222, 20%, 25%)"}
                  strokeWidth={edge.strength * 2 + 0.5}
                  strokeDasharray={edge.suspicious ? "6 3" : "none"}
                  filter={edge.suspicious ? "url(#glow-red)" : undefined}
                />
                {edge.label && (
                  <text
                    x={midX}
                    y={midY - 6}
                    textAnchor="middle"
                    fill="hsl(215, 20%, 55%)"
                    fontSize={9}
                    fontFamily="var(--font-mono)"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const pos = getPos(node.id);
            const config = nodeConfig[node.type];
            const isSelected = selectedNode?.id === node.id;
            const dimmed = connectedNodeIds && !connectedNodeIds.has(node.id);
            const radius = node.type === "user" ? 24 : node.type === "fraud_signal" ? 20 : 18;

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onMouseDown={(e) => handleMouseDown(node.id, e)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNode(selectedNode?.id === node.id ? null : node);
                }}
                style={{ cursor: "pointer" }}
                opacity={dimmed ? 0.15 : 1}
              >
                {/* Outer ring for selected / flagged */}
                {(isSelected || node.flagged) && (
                  <circle
                    r={radius + 6}
                    fill="none"
                    stroke={node.flagged ? "hsl(350, 89%, 60%)" : config.color}
                    strokeWidth={2}
                    strokeDasharray={node.flagged ? "4 2" : "none"}
                    opacity={0.5}
                  >
                    <animate attributeName="r" values={`${radius + 4};${radius + 8};${radius + 4}`} dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.5;0.2;0.5" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Glow */}
                <circle r={radius + 2} fill={config.color} opacity={0.15} filter="url(#glow)" />

                {/* Main circle */}
                <circle
                  r={radius}
                  fill="hsl(222, 44%, 9%)"
                  stroke={isSelected ? config.color : node.flagged ? "hsl(350, 89%, 60%)" : config.color}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                />

                {/* Icon placeholder - foreignObject for React icon */}
                <foreignObject x={-8} y={-8} width={16} height={16}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 16, height: 16 }}>
                    <NodeIcon node={node} />
                  </div>
                </foreignObject>

                {/* Label */}
                <text
                  y={radius + 14}
                  textAnchor="middle"
                  fill="hsl(210, 40%, 96%)"
                  fontSize={10}
                  fontFamily="var(--font-body)"
                  fontWeight={500}
                >
                  {node.label}
                </text>

                {/* Trust score badge for users */}
                {node.trustScore !== undefined && (
                  <g transform={`translate(${radius - 4}, ${-radius + 4})`}>
                    <rect
                      x={-12}
                      y={-8}
                      width={24}
                      height={14}
                      rx={4}
                      fill={node.trustScore >= 700 ? "hsl(160, 84%, 39%)" : node.trustScore >= 300 ? "hsl(38, 92%, 50%)" : "hsl(350, 89%, 60%)"}
                    />
                    <text
                      textAnchor="middle"
                      y={3}
                      fill="#fff"
                      fontSize={8}
                      fontFamily="var(--font-mono)"
                      fontWeight={600}
                    >
                      {node.trustScore}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Detail Panel */}
      {selectedNode && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="absolute top-4 right-4 w-64 glass rounded-xl p-4 z-10"
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${nodeConfig[selectedNode.type].color}20` }}
            >
              {(() => {
                const Icon = nodeConfig[selectedNode.type].icon;
                return <Icon className="w-5 h-5" style={{ color: nodeConfig[selectedNode.type].color }} />;
              })()}
            </div>
            <div>
              <div className="font-display font-semibold text-foreground text-sm">{selectedNode.label}</div>
              <div className="text-xs text-muted-foreground capitalize">{selectedNode.type.replace("_", " ")}</div>
            </div>
          </div>

          {selectedNode.trustScore !== undefined && (
            <div className="flex items-center justify-between py-2 border-t border-border">
              <span className="text-xs text-muted-foreground">Trust Score</span>
              <span
                className="text-sm font-mono font-bold"
                style={{
                  color:
                    selectedNode.trustScore >= 700
                      ? "hsl(160, 84%, 39%)"
                      : selectedNode.trustScore >= 300
                      ? "hsl(38, 92%, 50%)"
                      : "hsl(350, 89%, 60%)",
                }}
              >
                {selectedNode.trustScore}
              </span>
            </div>
          )}

          {selectedNode.detail && (
            <div className="flex items-center justify-between py-2 border-t border-border">
              <span className="text-xs text-muted-foreground">Status</span>
              <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                selectedNode.flagged
                  ? "bg-rose-glow/10 text-rose-glow"
                  : "bg-emerald-glow/10 text-emerald-glow"
              }`}>
                {selectedNode.detail}
              </span>
            </div>
          )}

          <div className="py-2 border-t border-border">
            <span className="text-xs text-muted-foreground">Connections</span>
            <div className="mt-2 space-y-1.5">
              {edges
                .filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
                .map((edge, i) => {
                  const otherId = edge.source === selectedNode.id ? edge.target : edge.source;
                  const otherNode = nodes.find((n) => n.id === otherId);
                  if (!otherNode) return null;
                  const cfg = nodeConfig[otherNode.type];
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs cursor-pointer hover:bg-secondary/30 rounded px-1.5 py-1 transition-colors"
                      onClick={() => setSelectedNode(otherNode)}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                      <span className="text-foreground">{otherNode.label}</span>
                      {edge.suspicious && (
                        <AlertTriangle className="w-3 h-3 ml-auto" style={{ color: "hsl(350, 89%, 60%)" }} />
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 glass rounded-lg px-3 py-2 flex flex-wrap gap-3">
        {(Object.entries(nodeConfig) as [NodeType, typeof nodeConfig[NodeType]][]).map(([type, cfg]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
            <span className="text-[10px] text-muted-foreground capitalize">{type.replace("_", " ")}</span>
          </div>
        ))}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 glass rounded-lg flex flex-col">
        <button
          className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors border-b border-border"
          onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
        >
          +
        </button>
        <button
          className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))}
        >
          -
        </button>
      </div>
    </div>
  );
};

export default IdentityGraph;
