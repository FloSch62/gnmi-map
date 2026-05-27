import fs from 'node:fs/promises';
import path from 'node:path';
import protobuf from 'protobufjs';
import { mapBounds, mapNodes as layoutNodes } from '../src/gnmiMap.js';

const GNMI_TAGS_API = 'https://api.github.com/repos/openconfig/gnmi/tags?per_page=30';
const GNMI_GITHUB_BASE = 'https://github.com/openconfig/gnmi/blob';
const GNMI_RAW_BASE = 'https://raw.githubusercontent.com/openconfig/gnmi';
const SPECBASE =
  'https://github.com/openconfig/reference/blob/master/rpc/gnmi/gnmi-specification.md';
const OUTPUT_PATH = path.resolve('src/gnmiMap.js');

const SCALAR_TYPES = new Set([
  'bool',
  'bytes',
  'double',
  'fixed32',
  'fixed64',
  'float',
  'int32',
  'int64',
  'sfixed32',
  'sfixed64',
  'sint32',
  'sint64',
  'string',
  'uint32',
  'uint64',
]);

const EXTERNAL_REFS = new Map([
  ['google.protobuf.Any', 'any'],
  ['google.protobuf.Duration', 'duration'],
]);

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

function stripLineComment(line) {
  return line.replace(/\/\/.*$/, '');
}

function definitionLines(protoText) {
  const lines = new Map();
  const stack = [];
  let packageName = '';
  let depth = 0;

  protoText.split('\n').forEach((line, index) => {
    const code = stripLineComment(line);
    const packageMatch = code.match(/^\s*package\s+([A-Za-z0-9_.]+)\s*;/);
    if (packageMatch) {
      packageName = packageMatch[1];
    }

    const definitionMatch = code.match(/^\s*(message|enum|service)\s+([A-Za-z_][A-Za-z0-9_]*)\b/);
    if (definitionMatch) {
      const [, , name] = definitionMatch;
      const parents = stack.map((entry) => entry.name);
      const fullName = [packageName, ...parents, name].filter(Boolean).join('.');
      lines.set(fullName, index + 1);
    }

    const openCount = (code.match(/{/g) ?? []).length;
    const closeCount = (code.match(/}/g) ?? []).length;

    if (definitionMatch && openCount > 0) {
      stack.push({ name: definitionMatch[2], depth: depth + openCount });
    }

    depth += openCount - closeCount;
    while (stack.length && depth < stack[stack.length - 1].depth) {
      stack.pop();
    }
  });

  return lines;
}

function methodLines(protoText) {
  const lines = new Map();
  protoText.split('\n').forEach((line, index) => {
    const match = stripLineComment(line).match(/^\s*rpc\s+([A-Za-z_][A-Za-z0-9_]*)\b/);
    if (match) {
      lines.set(match[1], index + 1);
    }
  });
  return lines;
}

function kebab(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .replace(/\./g, '-')
    .toLowerCase();
}

function titleFromNode(node) {
  return node.data.label.replace(/^enum\s+/, '');
}

function collectDefinitions(root) {
  const definitions = new Map();

  function visit(namespace) {
    if (!namespace.nested) {
      return;
    }

    Object.values(namespace.nested).forEach((item) => {
      if (item instanceof protobuf.Type || item instanceof protobuf.Enum) {
        definitions.set(item.fullName.replace(/^\./, ''), item);
      }
      visit(item);
    });
  }

  visit(root);
  return definitions;
}

function groupByShortName(definitions) {
  const byShort = new Map();
  definitions.forEach((definition, fullName) => {
    const shortName = fullName.split('.').at(-1);
    byShort.set(shortName, [...(byShort.get(shortName) ?? []), fullName]);
  });
  return byShort;
}

function specUrlFromLayout(node) {
  if (!node.data.specUrl) {
    return undefined;
  }
  const hash = node.data.specUrl.split('#')[1];
  return hash ? `${SPECBASE}#${hash}` : SPECBASE;
}

function resolveSymbol(node, definitions, byShortName) {
  if (node.data.sourceSymbol) {
    return node.data.sourceSymbol;
  }

  const title = titleFromNode(node);
  if (definitions.has(title)) {
    return title;
  }

  if (title.startsWith('gnmi_ext.')) {
    return title;
  }

  const matches = byShortName.get(title) ?? [];
  if (matches.length === 1) {
    return matches[0];
  }

  const gnmiMatch = matches.find((name) => name.startsWith('gnmi.'));
  if (gnmiMatch) {
    return gnmiMatch;
  }

  const extMatch = matches.find((name) => name.startsWith('gnmi_ext.'));
  if (extMatch) {
    return extMatch;
  }

  return null;
}

function displayType(field) {
  const base = field.map ? `map<${field.keyType},${field.type}>` : field.type;
  return field.repeated ? `repeated ${base}` : base;
}

function resolveFieldRef(field, currentSymbol, symbolToNodeId, byShortName) {
  if (field.map || SCALAR_TYPES.has(field.type)) {
    return null;
  }

  if (EXTERNAL_REFS.has(field.type)) {
    return EXTERNAL_REFS.get(field.type);
  }

  const currentParts = currentSymbol.split('.');
  const packageName = currentParts[0];
  const candidates = [];

  if (field.type.includes('.')) {
    candidates.push(field.type);
  } else {
    candidates.push(`${currentSymbol}.${field.type}`);
    candidates.push(`${packageName}.${field.type}`);
    candidates.push(...(byShortName.get(field.type) ?? []));
  }

  const target = candidates.find((candidate) => symbolToNodeId.has(candidate));
  return target ? symbolToNodeId.get(target) : null;
}

function reservedFields(type) {
  const numbers = [];
  const names = [];

  for (const item of type.reserved ?? []) {
    if (Array.isArray(item)) {
      const [start, end] = item;
      numbers.push(start === end ? `${start}` : `${start}-${end}`);
    } else {
      names.push(item);
    }
  }

  const count = Math.max(numbers.length, names.length);
  return Array.from({ length: count }, (_, index) => {
    const name = names[index];
    const number = numbers[index];
    const label = [name, number].filter(Boolean).join(' / ');
    return {
      id: `reserved-${kebab(name ?? number ?? `${index + 1}`)}`,
      type: 'reserved',
      name: label,
      ref: null,
      badge: 'reserved',
    };
  });
}

function fieldData(field, currentSymbol, symbolToNodeId, byShortName) {
  const deprecated = Boolean(field.options?.deprecated);
  const data = {
    id: kebab(field.name),
    type: displayType(field),
    name: field.name,
    ref: resolveFieldRef(field, currentSymbol, symbolToNodeId, byShortName),
  };

  if (field.partOf) {
    data.group = `oneof ${field.partOf.name}`;
  }
  if (deprecated) {
    data.badge = 'deprecated';
    data.deprecated = true;
  } else if (field.name === 'extension' && field.type === 'gnmi_ext.Extension') {
    data.badge = 'optional';
  }

  return data;
}

function enumFields(enumDefinition) {
  return Object.entries(enumDefinition.values).map(([name, value]) => ({
    id: kebab(name.replace(/^EID_/, '')),
    type: `${value}`,
    name,
    ref: null,
  }));
}

function protoUrl(source, line, gnmiTag) {
  if (!line) {
    return undefined;
  }

  const file =
    source === 'gnmi_ext' ? 'proto/gnmi_ext/gnmi_ext.proto' : 'proto/gnmi/gnmi.proto';
  return `${GNMI_GITHUB_BASE}/${gnmiTag}/${file}#L${line}`;
}

function buildSymbolMaps(nodes, definitions, byShortName) {
  const symbolToNodeId = new Map();
  const nodeIdToSymbol = new Map();

  nodes.forEach((node) => {
    const symbol = resolveSymbol(node, definitions, byShortName);
    if (!symbol || !definitions.has(symbol)) {
      return;
    }
    symbolToNodeId.set(symbol, node.id);
    nodeIdToSymbol.set(node.id, symbol);
  });

  return { nodeIdToSymbol, symbolToNodeId };
}

function serviceNode(node, service, serviceLine, serviceVersion, gnmiTag) {
  const methods = service.methodsArray;
  return {
    ...node,
    style: { ...node.style },
    data: {
      id: node.id,
      kind: node.data.kind,
      label: `service gNMI ${serviceVersion}`,
      protoUrl: protoUrl('gnmi', serviceLine, gnmiTag),
      specUrl: specUrlFromLayout(node),
      fields: methods.map((method) => ({
        id: kebab(method.name),
        type: 'rpc',
        name: method.name,
        ref: `rpc-${kebab(method.name)}`,
        ...(method.requestStream || method.responseStream ? { badge: 'stream' } : {}),
      })),
    },
  };
}

function rpcNode(node, service, rpcLines, gnmiTag) {
  const methodName = node.id.replace(/^rpc-/, '').replace(/(^|-)([a-z])/g, (_, __, letter) =>
    letter.toUpperCase(),
  );
  const method = service.methods[methodName];
  if (!method) {
    return node;
  }

  return {
    ...node,
    style: { ...node.style },
    data: {
      id: node.id,
      kind: node.data.kind,
      label: `rpc ${method.name}`,
      protoUrl: protoUrl('gnmi', rpcLines.get(method.name), gnmiTag),
      specUrl: specUrlFromLayout(node),
      fields: [
        {
          id: 'takes',
          type: method.requestStream ? 'takes stream' : 'takes',
          name: method.requestType,
          ref: kebab(method.requestType),
        },
        {
          id: 'returns',
          type: method.responseStream ? 'returns stream' : 'returns',
          name: method.responseType,
          ref: kebab(method.responseType),
        },
      ],
    },
  };
}

function schemaNode(
  node,
  definition,
  symbol,
  symbolToNodeId,
  byShortName,
  linesBySource,
  gnmiTag,
) {
  const source = symbol.startsWith('gnmi_ext.') ? 'gnmi_ext' : 'gnmi';
  const fields =
    definition instanceof protobuf.Type
      ? [
          ...definition.fieldsArray.map((field) =>
            fieldData(field, symbol, symbolToNodeId, byShortName),
          ),
          ...reservedFields(definition),
        ]
      : enumFields(definition);
  const deprecated = Boolean(definition.options?.deprecated);
  const badges = deprecated
    ? [...new Set([...(node.data.badges ?? []), 'deprecated'])]
    : node.data.badges?.filter((badge) => badge !== 'deprecated');

  return {
    ...node,
    style: { ...node.style },
    data: {
      id: node.id,
      kind: node.data.kind,
      label: node.data.label,
      sourceSymbol: symbol,
      deprecated,
      protoUrl: protoUrl(source, linesBySource[source].get(symbol), gnmiTag),
      specUrl: specUrlFromLayout(node),
      ...(badges?.length ? { badges } : {}),
      fields,
    },
  };
}

function edgeKind(sourceNode, field, targetNode) {
  if (field.type === 'rpc') {
    return 'rpc';
  }
  if (field.type.includes('gnmi_ext.Extension')) {
    return 'extension';
  }
  if (sourceNode.data.sourceSymbol?.startsWith('gnmi_ext.')) {
    return 'extension-detail';
  }
  if (targetNode.data.sourceSymbol?.startsWith('gnmi_ext.')) {
    return 'extension-detail';
  }
  return 'field';
}

function buildEdges(nodes) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const edges = [];

  for (const node of nodes) {
    for (const field of node.data.fields ?? []) {
      if (!field.ref || !nodesById.has(field.ref)) {
        continue;
      }
      const targetNode = nodesById.get(field.ref);
      const kind = edgeKind(node, field, targetNode);
      edges.push({
        id: `${node.id}:${field.id}->${field.ref}`,
        source: node.id,
        sourceHandle: field.id,
        target: field.ref,
        kind,
        deprecated: Boolean(field.deprecated || targetNode.data.deprecated),
      });
    }
  }

  return edges;
}

function generatedSource({ nodes, edges, bounds, source }) {
  return `// Generated by scripts/generate-map-data.mjs. Do not edit by hand.\n\nexport const mapSource = ${JSON.stringify(
    source,
    null,
    2,
  )};\n\nexport const mapNodes = ${JSON.stringify(nodes, null, 2)};\n\nexport const mapEdges = ${JSON.stringify(
    edges,
    null,
    2,
  )};\n\nexport const mapBounds = ${JSON.stringify(bounds, null, 2)};\n\nexport function getVisibleMap({ showDeprecated = false, showExtensions = true } = {}) {\n  const visibleNodes = mapNodes\n    .filter((node) => showDeprecated || !node.data.deprecated)\n    .map((node) => ({\n      ...node,\n      data: {\n        ...node.data,\n        fields: (node.data.fields ?? []).filter((field) => showDeprecated || !field.deprecated),\n      },\n    }));\n  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));\n  const visibleHandles = new Set(\n    visibleNodes.flatMap((node) =>\n      (node.data.fields ?? []).map((field) => \`\${node.id}:\${field.id}\`),\n    ),\n  );\n  const visibleEdges = mapEdges.filter((edge) => {\n    if (!showExtensions && edge.kind === 'extension') {\n      return false;\n    }\n    if (!showDeprecated && edge.deprecated) {\n      return false;\n    }\n    return (\n      visibleNodeIds.has(edge.source) &&\n      visibleNodeIds.has(edge.target) &&\n      visibleHandles.has(\`\${edge.source}:\${edge.sourceHandle}\`)\n    );\n  });\n\n  return { nodes: visibleNodes, edges: visibleEdges };\n}\n`;
}

async function main() {
  const tags = await fetchJson(GNMI_TAGS_API);
  const latestTag = tags.find((tag) => /^v\d+\.\d+\.\d+$/.test(tag.name));
  if (!latestTag) {
    throw new Error('Could not resolve latest openconfig/gnmi tag');
  }

  const gnmiTag = latestTag.name;
  const gnmiRawUrl = `${GNMI_RAW_BASE}/${gnmiTag}/proto/gnmi/gnmi.proto`;
  const extRawUrl = `${GNMI_RAW_BASE}/${gnmiTag}/proto/gnmi_ext/gnmi_ext.proto`;
  const [gnmiProto, extProto] = await Promise.all([fetchText(gnmiRawUrl), fetchText(extRawUrl)]);

  const root = new protobuf.Root();
  protobuf.parse(extProto, root, { keepCase: true });
  protobuf.parse(gnmiProto, root, { keepCase: true });

  const definitions = collectDefinitions(root);
  const byShortName = groupByShortName(definitions);
  const { nodeIdToSymbol, symbolToNodeId } = buildSymbolMaps(
    layoutNodes,
    definitions,
    byShortName,
  );
  const service = root.lookupService('gnmi.gNMI');
  const serviceVersion = root.nested.gnmi.options['(gnmi_service)'];
  const linesBySource = {
    gnmi: definitionLines(gnmiProto),
    gnmi_ext: definitionLines(extProto),
  };
  const rpcLines = methodLines(gnmiProto);

  const nodes = layoutNodes.map((node) => {
    if (node.id === 'service-gnmi') {
      return serviceNode(node, service, linesBySource.gnmi.get('gnmi.gNMI'), serviceVersion, gnmiTag);
    }
    if (node.data.kind === 'rpc') {
      return rpcNode(node, service, rpcLines, gnmiTag);
    }

    const symbol = nodeIdToSymbol.get(node.id);
    if (symbol) {
      return schemaNode(
        node,
        definitions.get(symbol),
        symbol,
        symbolToNodeId,
        byShortName,
        linesBySource,
        gnmiTag,
      );
    }

    return {
      ...node,
      style: { ...node.style },
      data: {
        ...node.data,
        id: node.id,
        specUrl: specUrlFromLayout(node),
      },
    };
  });
  const edges = buildEdges(nodes);
  const source = {
    gnmiTag,
    gnmiServiceVersion: serviceVersion,
    gnmiBase: `${GNMI_GITHUB_BASE}/${gnmiTag}/proto/gnmi/gnmi.proto`,
    extBase: `${GNMI_GITHUB_BASE}/${gnmiTag}/proto/gnmi_ext/gnmi_ext.proto`,
    specBase: SPECBASE,
  };

  await fs.writeFile(OUTPUT_PATH, generatedSource({ nodes, edges, bounds: mapBounds, source }));
  console.log(`Wrote ${OUTPUT_PATH} from openconfig/gnmi ${gnmiTag}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
