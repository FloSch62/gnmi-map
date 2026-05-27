import React, { useCallback, useMemo, useState } from 'react';
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  BookOpen,
  ExternalLink,
  EyeOff,
  FileCode2,
  FileDown,
  Focus,
  GitBranch,
  Search,
} from 'lucide-react';
import { getVisibleMap, mapBounds, mapSource } from './gnmiMap.js';

const edgeStyleByKind = {
  rpc: { stroke: '#0b4b8f', strokeWidth: 2.2 },
  field: { stroke: '#5b708a', strokeWidth: 1.6 },
  extension: {
    stroke: '#8a6a1f',
    strokeWidth: 1.4,
    strokeDasharray: '7 6',
  },
  'extension-detail': { stroke: '#b47a18', strokeWidth: 1.5 },
};

const nodeTypes = {
  schema: SchemaNode,
};

function searchableText(node) {
  const fieldText = node.data.fields
    ?.map((field) => `${field.type} ${field.name} ${field.group ?? ''} ${field.badge ?? ''}`)
    .join(' ');

  return `${node.data.kind} ${node.data.label} ${fieldText ?? ''}`.toLowerCase();
}

function fieldMatches(field, query) {
  if (!query) {
    return false;
  }

  return `${field.type} ${field.name} ${field.group ?? ''} ${field.badge ?? ''}`
    .toLowerCase()
    .includes(query);
}

function AppShell() {
  const { fitView } = useReactFlow();
  const [queryValue, setQueryValue] = useState('');
  const [showExtensions, setShowExtensions] = useState(false);
  const [showDeprecated, setShowDeprecated] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const query = queryValue.trim().toLowerCase();
  const visibleMap = useMemo(
    () => getVisibleMap({ showDeprecated, showExtensions }),
    [showDeprecated, showExtensions],
  );

  const nodeMatches = useMemo(() => {
    if (!query) {
      return new Set();
    }

    return new Set(
      visibleMap.nodes
        .filter((currentNode) => searchableText(currentNode).includes(query))
        .map((currentNode) => currentNode.id),
    );
  }, [query, visibleMap.nodes]);

  const nodes = useMemo(
    () =>
      visibleMap.nodes.map((currentNode) => {
        const active = !query || nodeMatches.has(currentNode.id);
        return {
          ...currentNode,
          data: {
            ...currentNode.data,
            active,
            query,
            showExtensions,
          },
        };
      }),
    [nodeMatches, query, showExtensions, visibleMap.nodes],
  );

  const edges = useMemo(
    () =>
      visibleMap.edges.map((edge) => {
        const connectedToMatch =
          !query || nodeMatches.has(edge.source) || nodeMatches.has(edge.target);
        const style = edgeStyleByKind[edge.kind] ?? edgeStyleByKind.field;

        return {
          ...edge,
          type: 'smoothstep',
          className: `flow-edge flow-edge-${edge.kind}`,
          markerEnd: { type: MarkerType.ArrowClosed, color: style.stroke },
          animated: query ? connectedToMatch : edge.kind === 'rpc',
          style: {
            ...style,
            opacity: connectedToMatch ? 1 : 0.12,
          },
        };
      }),
    [nodeMatches, query, visibleMap.edges],
  );

  const selectedNode = useMemo(
    () => nodes.find((currentNode) => currentNode.id === selectedId),
    [nodes, selectedId],
  );

  const fit = useCallback(() => {
    fitView({ padding: 0.12, duration: 450 });
  }, [fitView]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-kicker">gNMI service {mapSource.gnmiServiceVersion}</span>
          <h1>React Flow Map</h1>
        </div>

        <div className="toolbar" role="toolbar" aria-label="Map controls">
          <label className="search-box">
            <Search size={16} aria-hidden="true" />
            <input
              value={queryValue}
              onChange={(event) => setQueryValue(event.target.value)}
              placeholder="Search messages, fields, enums"
              type="search"
            />
          </label>

          <button className="tool-button" type="button" onClick={fit}>
            <Focus size={16} aria-hidden="true" />
            Fit
          </button>

          <button
            className={`tool-button ${showExtensions ? 'is-active' : ''}`}
            type="button"
            onClick={() => setShowExtensions((value) => !value)}
            aria-pressed={showExtensions}
          >
            <GitBranch size={16} aria-hidden="true" />
            Extensions
          </button>

          <button
            className={`tool-button ${showDeprecated ? 'is-active' : ''}`}
            type="button"
            onClick={() => setShowDeprecated((value) => !value)}
            aria-pressed={showDeprecated}
          >
            <EyeOff size={16} aria-hidden="true" />
            Deprecated
          </button>

          <a className="tool-button" href="/gnmi_0.10.0_map.pdf" target="_blank" rel="noreferrer">
            <FileDown size={16} aria-hidden="true" />
            PDF
          </a>
        </div>
      </header>

      <main className="map-stage">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          minZoom={0.18}
          maxZoom={1.7}
          defaultViewport={{ x: 70, y: 40, zoom: 0.42 }}
          fitView
          fitViewOptions={{ padding: 0.08 }}
          onNodeClick={(_, node) => setSelectedId(node.id)}
          onPaneClick={() => setSelectedId(null)}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#c4ced9" gap={34} size={1.1} />
          <Controls position="bottom-left" />
          <MiniMap
            position="bottom-right"
            pannable
            zoomable
            nodeColor={(node) => minimapColor(node.data.kind)}
            maskColor="rgba(15, 23, 42, 0.08)"
          />
        </ReactFlow>

        <Inspector
          node={selectedNode}
          totalNodes={visibleMap.nodes.length}
          totalEdges={visibleMap.edges.length}
        />
      </main>
    </div>
  );
}

function SchemaNode({ data, selected }) {
  const fields = data.fields ?? [];
  const dimmed = data.active === false;
  const className = [
    'schema-node',
    `kind-${data.kind}`,
    selected ? 'is-selected' : '',
    dimmed ? 'is-dimmed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={className}>
      <Handle type="target" position={Position.Left} className="node-target" />

      <header className="node-header">
        <span className="node-kind">{data.kind}</span>
        <strong title={data.label}>{data.label}</strong>
        <div className="node-links nodrag nopan">
          {data.protoUrl ? (
            <a href={data.protoUrl} title="Proto definition" target="_blank" rel="noreferrer">
              <FileCode2 size={14} aria-hidden="true" />
            </a>
          ) : null}
          {data.specUrl ? (
            <a href={data.specUrl} title="gNMI documentation" target="_blank" rel="noreferrer">
              <BookOpen size={14} aria-hidden="true" />
            </a>
          ) : null}
        </div>
      </header>

      {data.badges?.length ? (
        <div className="node-badges">
          {data.badges.map((badge) => (
            <span key={badge}>{badge}</span>
          ))}
        </div>
      ) : null}

      <div className="node-body">
        {fields.length ? (
          fields.map((field) => (
            <FieldRow
              key={field.id}
              field={field}
              highlighted={fieldMatches(field, data.query)}
              showExtensions={data.showExtensions}
            />
          ))
        ) : (
          <div className="empty-field">empty message</div>
        )}
      </div>
    </section>
  );
}

function FieldRow({ field, highlighted, showExtensions }) {
  const isExtension = field.ref === 'extension';
  const visibleExtensionHandle = !isExtension || showExtensions;

  return (
    <div
      className={[
        'field-row',
        field.ref ? 'has-ref' : '',
        highlighted ? 'is-highlighted' : '',
        field.badge === 'deprecated' ? 'is-deprecated' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="field-type">{field.type}</span>
      <span className="field-name">{field.name}</span>
      {field.group ? <span className="field-group">{field.group}</span> : null}
      {field.badge ? <span className={`field-badge badge-${field.badge}`}>{field.badge}</span> : null}
      {field.ref && visibleExtensionHandle ? (
        <Handle
          type="source"
          id={field.id}
          position={Position.Right}
          className="field-handle"
          title={`${field.name} -> ${field.ref}`}
        />
      ) : null}
    </div>
  );
}

function Inspector({ node, totalNodes, totalEdges }) {
  if (!node) {
    return (
      <aside className="inspector">
        <span className="inspector-kicker">Map</span>
        <h2>{totalNodes} nodes</h2>
        <p>{totalEdges} relationships across gNMI RPCs, messages, enums, and external types.</p>
      </aside>
    );
  }

  return (
    <aside className="inspector">
      <span className="inspector-kicker">{node.data.kind}</span>
      <h2>{node.data.label}</h2>

      <div className="inspector-actions">
        {node.data.protoUrl ? (
          <a href={node.data.protoUrl} target="_blank" rel="noreferrer">
            <FileCode2 size={15} aria-hidden="true" />
            Proto
            <ExternalLink size={13} aria-hidden="true" />
          </a>
        ) : null}
        {node.data.specUrl ? (
          <a href={node.data.specUrl} target="_blank" rel="noreferrer">
            <BookOpen size={15} aria-hidden="true" />
            Docs
            <ExternalLink size={13} aria-hidden="true" />
          </a>
        ) : null}
      </div>

      {node.data.fields?.length ? (
        <div className="inspector-fields">
          {node.data.fields.map((field) => (
            <div key={field.id} className="inspector-field">
              <span>{field.type}</span>
              <strong>{field.name}</strong>
            </div>
          ))}
        </div>
      ) : (
        <p>No fields.</p>
      )}
    </aside>
  );
}

function minimapColor(kind) {
  if (kind === 'service') {
    return '#0b4b8f';
  }
  if (kind === 'rpc') {
    return '#1d6eb8';
  }
  if (kind === 'enum') {
    return '#ab5d00';
  }
  if (kind === 'external') {
    return '#485161';
  }
  if (kind === 'legend') {
    return '#748295';
  }
  return '#1f7a72';
}

export default function App() {
  return (
    <ReactFlowProvider>
      <AppShell bounds={mapBounds} />
    </ReactFlowProvider>
  );
}
