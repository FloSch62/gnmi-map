import { getVisibleMap, mapEdges, mapNodes, mapSource } from '../src/gnmiMap.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateEdges(nodes, edges, label) {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const handles = new Set(
    nodes.flatMap((node) => (node.data.fields ?? []).map((field) => `${node.id}:${field.id}`)),
  );

  for (const edge of edges) {
    assert(nodeIds.has(edge.source), `${label}: edge ${edge.id} has missing source ${edge.source}`);
    assert(nodeIds.has(edge.target), `${label}: edge ${edge.id} has missing target ${edge.target}`);
    assert(
      handles.has(`${edge.source}:${edge.sourceHandle}`),
      `${label}: edge ${edge.id} has missing source handle ${edge.sourceHandle}`,
    );
  }
}

function validateLinks() {
  for (const node of mapNodes) {
    if (node.data.protoUrl?.startsWith('https://github.com/openconfig/gnmi/blob/')) {
      const validProtoBase =
        node.data.protoUrl.startsWith(mapSource.gnmiBase) ||
        node.data.protoUrl.startsWith(mapSource.extBase);
      assert(validProtoBase, `${node.id}: protoUrl does not use configured proto bases`);
    }

    if (node.data.specUrl) {
      assert(
        node.data.specUrl.startsWith(mapSource.specBase),
        `${node.id}: specUrl does not use configured spec base`,
      );
    }
  }
}

function validateDeprecatedVisibility() {
  const rawSubscribeResponse = mapNodes.find((node) => node.id === 'subscribe-response');
  assert(rawSubscribeResponse, 'raw map is missing SubscribeResponse');
  const rawErrorField = rawSubscribeResponse.data.fields.find((field) => field.name === 'error');
  assert(rawErrorField?.deprecated, 'raw SubscribeResponse.error must be preserved as deprecated');

  const defaultMap = getVisibleMap();
  const defaultSubscribeResponse = defaultMap.nodes.find((node) => node.id === 'subscribe-response');
  assert(defaultSubscribeResponse, 'default map is missing SubscribeResponse');
  assert(
    !defaultSubscribeResponse.data.fields.some((field) => field.name === 'error'),
    'default SubscribeResponse must hide deprecated error field',
  );
  assert(
    defaultMap.nodes.every((node) => !node.data.deprecated),
    'default map must hide deprecated nodes',
  );
  assert(
    defaultMap.nodes.every((node) => (node.data.fields ?? []).every((field) => !field.deprecated)),
    'default map must hide deprecated fields',
  );

  const deprecatedMap = getVisibleMap({ showDeprecated: true });
  const deprecatedSubscribeResponse = deprecatedMap.nodes.find(
    (node) => node.id === 'subscribe-response',
  );
  assert(
    deprecatedSubscribeResponse?.data.fields.some((field) => field.name === 'error'),
    'deprecated map must include SubscribeResponse.error',
  );
}

validateEdges(mapNodes, mapEdges, 'raw map');
validateEdges(getVisibleMap().nodes, getVisibleMap().edges, 'default map');
validateEdges(
  getVisibleMap({ showDeprecated: true }).nodes,
  getVisibleMap({ showDeprecated: true }).edges,
  'deprecated map',
);
validateLinks();
validateDeprecatedVisibility();

console.log('Map data is valid');
