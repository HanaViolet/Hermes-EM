import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { GraphLink, GraphNode } from '@/types/social';
import { TERMINAL } from '@/components/market/marketTerminal';

const AGENT_TYPE_LABEL: Record<string, string> = {
  retail: '散',
  hot_money: '游',
  mutual_fund: '公',
  quant: '量',
  northbound: '北',
  national_team: '国',
  news: '新',
  training_quant: 'H',
};

function influenceColor(value: number): string {
  if (value > 0.6) return TERMINAL.red;
  if (value > 0.3) return TERMINAL.amber;
  return TERMINAL.blue;
}

function topoKey(nodes: GraphNode[], links: GraphLink[]): string {
  const nodeIds = nodes.map((node) => node.id).sort().join(',');
  const linkIds = links
    .map((link) => {
      const source = typeof link.source === 'string' ? link.source : link.source.id;
      const target = typeof link.target === 'string' ? link.target : link.target.id;
      return `${source}->${target}`;
    })
    .sort()
    .join(',');
  return `${nodeIds}|${linkIds}`;
}

interface TopologyGraphProps {
  nodes: GraphNode[];
  links: GraphLink[];
  selectedId: string | null;
  onSelectAgent: (id: string) => void;
  width?: number;
  height?: number;
}

export default function TopologyGraph({
  nodes,
  links,
  selectedId,
  onSelectAgent,
  width = 1200,
  height = 300,
}: TopologyGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const nodeDataRef = useRef<GraphNode[]>([]);
  const nodeElRef = useRef<d3.Selection<SVGGElement, GraphNode, SVGGElement, unknown> | null>(null);
  const linkElRef = useRef<d3.Selection<SVGLineElement, GraphLink, SVGGElement, unknown> | null>(null);
  const topoKeyRef = useRef<string>('');

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const key = topoKey(nodes, links);
    if (key === topoKeyRef.current) return;
    topoKeyRef.current = key;
    simRef.current?.stop();

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const previous = new Map(nodeDataRef.current.map((node) => [node.id, node]));
    const nodeData: GraphNode[] = nodes.map((node) => {
      const oldNode = previous.get(node.id);
      return { ...node, x: oldNode?.x, y: oldNode?.y };
    });
    nodeDataRef.current = nodeData;

    const idToNode = new Map(nodeData.map((node) => [node.id, node]));
    const linkData: GraphLink[] = links
      .map((link) => {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;
        const source = idToNode.get(sourceId);
        const target = idToNode.get(targetId);
        if (!source || !target) return null;
        return { source, target, weight: link.weight };
      })
      .filter((link): link is GraphLink => Boolean(link));

    svg
      .append('defs')
      .append('marker')
      .attr('id', 'social-arrow')
      .attr('viewBox', '0 -4 8 8')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', TERMINAL.borderSoft);

    const graph = svg.append('g');
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.35, 4])
        .on('zoom', (event) => graph.attr('transform', event.transform)),
    );

    const linkEl = graph.append('g')
      .selectAll<SVGLineElement, GraphLink>('line')
      .data(linkData)
      .enter()
      .append('line')
      .attr('stroke', TERMINAL.borderSoft)
      .attr('stroke-width', (link) => Math.max(0.7, link.weight * 2.8))
      .attr('stroke-opacity', (link) => 0.25 + link.weight * 0.55)
      .attr('marker-end', 'url(#social-arrow)');
    linkElRef.current = linkEl;

    const nodeEl = graph.append('g')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(nodeData, (node) => node.id)
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .on('click', (_event, node) => onSelectAgent(node.id))
      .call(
        d3.drag<SVGGElement, GraphNode>()
          .on('start', (event, node) => {
            if (!event.active) simRef.current?.alphaTarget(0.15).restart();
            node.fx = node.x;
            node.fy = node.y;
          })
          .on('drag', (event, node) => {
            node.fx = event.x;
            node.fy = event.y;
          })
          .on('end', (event, node) => {
            if (!event.active) simRef.current?.alphaTarget(0);
            node.fx = null;
            node.fy = null;
          }),
      );
    nodeElRef.current = nodeEl;

    nodeEl.append('circle')
      .attr('r', (node) => 8 + node.influenceScore * 14)
      .attr('fill', (node) => influenceColor(node.influenceScore))
      .attr('stroke', TERMINAL.border)
      .attr('stroke-width', 1);

    nodeEl.append('text')
      .text((node) => AGENT_TYPE_LABEL[node.type] ?? '?')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', 9)
      .attr('font-family', 'monospace')
      .attr('fill', '#fff')
      .attr('pointer-events', 'none');

    nodeEl.append('text')
      .text((node) => node.name.slice(0, 5))
      .attr('x', 0)
      .attr('y', (node) => 10 + node.influenceScore * 14 + 12)
      .attr('text-anchor', 'middle')
      .attr('font-size', 8)
      .attr('font-family', 'monospace')
      .attr('fill', TERMINAL.textDim)
      .attr('pointer-events', 'none');

    const simulation = d3.forceSimulation<GraphNode>(nodeData)
      .alphaDecay(0.04)
      .velocityDecay(0.5)
      .force('link', d3.forceLink<GraphNode, GraphLink>(linkData).id((node) => node.id).distance(96).strength(0.4))
      .force('charge', d3.forceManyBody().strength(-160))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.07))
      .force('collide', d3.forceCollide<GraphNode>().radius((node) => 14 + node.influenceScore * 15).strength(0.85));

    simulation.on('tick', () => {
      linkElRef.current
        ?.attr('x1', (link) => (link.source as GraphNode).x ?? 0)
        .attr('y1', (link) => (link.source as GraphNode).y ?? 0)
        .attr('x2', (link) => (link.target as GraphNode).x ?? 0)
        .attr('y2', (link) => (link.target as GraphNode).y ?? 0);
      nodeElRef.current?.attr('transform', (node) => `translate(${node.x ?? 0},${node.y ?? 0})`);
    });

    simRef.current = simulation;
  }, [nodes, links, width, height, onSelectAgent]);

  useEffect(() => {
    if (!nodeElRef.current) return;
    nodeElRef.current.select('circle')
      .attr('stroke', (node) => (node.id === selectedId ? TERMINAL.text : TERMINAL.border))
      .attr('stroke-width', (node) => (node.id === selectedId ? 2.5 : 1));
  }, [selectedId]);

  useEffect(() => {
    if (!nodeElRef.current || nodes.length === 0) return;
    const fresh = new Map(nodes.map((node) => [node.id, node]));
    nodeElRef.current.select('circle')
      .attr('r', (node) => {
        const next = fresh.get(node.id);
        if (next) node.influenceScore = next.influenceScore;
        return 8 + node.influenceScore * 14;
      })
      .attr('fill', (node) => influenceColor(node.influenceScore));
  }, [nodes]);

  useEffect(() => () => {
    simRef.current?.stop();
  }, []);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ backgroundColor: TERMINAL.panelInset, display: 'block', width: '100%' }}
    />
  );
}
