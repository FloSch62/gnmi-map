const GNMIBASE =
  'https://github.com/openconfig/gnmi/blob/d19cebf5e7be48e7a6fa9fbdff668d18ad87be9d/proto/gnmi/gnmi.proto';
const EXTBBASE =
  'https://github.com/openconfig/gnmi/blob/d19cebf5e7be48e7a6fa9fbdff668d18ad87be9d/proto/gnmi_ext/gnmi_ext.proto';
const SPECBASE =
  'https://github.com/openconfig/reference/blob/638fba23f697d67a0f8b6b683d492b8a1254817d/rpc/gnmi/gnmi-specification.md';

const proto = (line) => `${GNMIBASE}#L${line}`;
const extProto = (line) => `${EXTBBASE}#L${line}`;
const spec = (anchor) => `${SPECBASE}#${anchor}`;

const node = (id, kind, label, x, y, width, data = {}) => ({
  id,
  type: 'schema',
  position: { x, y },
  style: { width },
  data: {
    id,
    kind,
    label,
    ...data,
  },
});

const f = (id, type, name, ref, extra = {}) => ({
  id,
  type,
  name,
  ref,
  ...extra,
});

const e = (source, sourceHandle, target, kind = 'field') => ({
  id: `${source}:${sourceHandle}->${target}`,
  source,
  sourceHandle,
  target,
  kind,
});

export const mapNodes = [
  node('service-gnmi', 'service', 'service gNMI 0.7.0', 1240, 40, 330, {
    protoUrl: proto(44),
    specUrl: spec('grpc-network-management-interface-gnmi'),
    fields: [
      f('capabilities', 'rpc', 'Capabilities', 'rpc-capabilities'),
      f('get', 'rpc', 'Get', 'rpc-get'),
      f('set', 'rpc', 'Set', 'rpc-set'),
      f('subscribe', 'rpc', 'Subscribe', 'rpc-subscribe', { badge: 'stream' }),
    ],
  }),

  node('rpc-set', 'rpc', 'rpc Set', 80, 230, 250, {
    protoUrl: proto(62),
    specUrl: spec('34-modifying-state'),
    fields: [
      f('takes', 'takes', 'SetRequest', 'set-request'),
      f('returns', 'returns', 'SetResponse', 'set-response'),
    ],
  }),
  node('rpc-subscribe', 'rpc', 'rpc Subscribe', 780, 230, 290, {
    protoUrl: proto(68),
    specUrl: spec('35-subscribing-to-telemetry-updates'),
    fields: [
      f('takes', 'takes stream', 'SubscribeRequest', 'subscribe-request'),
      f('returns', 'returns stream', 'SubscribeResponse', 'subscribe-response'),
    ],
  }),
  node('rpc-get', 'rpc', 'rpc Get', 1520, 230, 250, {
    protoUrl: proto(57),
    specUrl: spec('33-retrieving-snapshots-of-state-information'),
    fields: [
      f('takes', 'takes', 'GetRequest', 'get-request'),
      f('returns', 'returns', 'GetResponse', 'get-response'),
    ],
  }),
  node('rpc-capabilities', 'rpc', 'rpc Capabilities', 2200, 230, 300, {
    protoUrl: proto(51),
    specUrl: spec('32-capability-discovery'),
    fields: [
      f('takes', 'takes', 'CapabilityRequest', 'capability-request'),
      f('returns', 'returns', 'CapabilityResponse', 'capability-response'),
    ],
  }),

  node('set-request', 'message', 'SetRequest', 20, 450, 340, {
    protoUrl: proto(339),
    specUrl: spec('341-the-setrequest-message'),
    fields: [
      f('prefix', 'Path', 'prefix', 'path'),
      f('delete', 'repeated Path', 'delete', 'path'),
      f('replace', 'repeated Update', 'replace', 'update'),
      f('update', 'repeated Update', 'update', 'update'),
      f('extension', 'repeated gnmi_ext.Extension', 'extension', 'extension', {
        badge: 'optional',
      }),
    ],
  }),
  node('set-response', 'message', 'SetResponse', 390, 450, 360, {
    protoUrl: proto(356),
    specUrl: spec('342-the-setresponse-message'),
    fields: [
      f('prefix', 'Path', 'prefix', 'path'),
      f('response', 'repeated UpdateResult', 'response', 'update-result'),
      f('message', 'Error', 'message', 'error', { badge: 'deprecated' }),
      f('timestamp', 'int64', 'timestamp'),
      f('extension', 'repeated gnmi_ext.Extension', 'extension', 'extension', {
        badge: 'optional',
      }),
    ],
  }),
  node('subscribe-request', 'message', 'SubscribeRequest', 780, 450, 360, {
    protoUrl: proto(208),
    specUrl: spec('3511-the-subscriberequest-message'),
    fields: [
      f('subscribe', 'SubscriptionList', 'subscribe', 'subscription-list', {
        group: 'oneof request',
      }),
      f('poll', 'Poll', 'poll', 'poll', { group: 'oneof request' }),
      f('aliases', 'AliasList', 'aliases', 'alias-list', {
        group: 'oneof request',
      }),
      f('extension', 'repeated gnmi_ext.Extension', 'extension', 'extension', {
        badge: 'optional',
      }),
    ],
  }),
  node('subscribe-response', 'message', 'SubscribeResponse', 1180, 450, 360, {
    protoUrl: proto(232),
    specUrl: spec('3514-the-subscriberesponse-message'),
    fields: [
      f('update', 'Notification', 'update', 'notification', {
        group: 'oneof response',
      }),
      f('sync-response', 'bool', 'sync_response', null, {
        group: 'oneof response',
      }),
      f('error', 'Error', 'error', 'error', {
        badge: 'deprecated',
        group: 'oneof response',
      }),
      f('extension', 'repeated gnmi_ext.Extension', 'extension', 'extension', {
        badge: 'optional',
      }),
    ],
  }),
  node('get-request', 'message', 'GetRequest', 1570, 450, 350, {
    protoUrl: proto(395),
    specUrl: spec('331-the-getrequest-message'),
    fields: [
      f('prefix', 'Path', 'prefix', 'path'),
      f('path', 'repeated Path', 'path', 'path'),
      f('type', 'DataType', 'type', 'data-type'),
      f('encoding', 'Encoding', 'encoding', 'encoding'),
      f('use-models', 'repeated ModelData', 'use_models', 'model-data'),
      f('extension', 'repeated gnmi_ext.Extension', 'extension', 'extension', {
        badge: 'optional',
      }),
    ],
  }),
  node('get-response', 'message', 'GetResponse', 1960, 450, 350, {
    protoUrl: proto(420),
    specUrl: spec('332-the-getresponse-message'),
    fields: [
      f('notification', 'repeated Notification', 'notification', 'notification'),
      f('error', 'Error', 'error', 'error', { badge: 'deprecated' }),
      f('extension', 'repeated gnmi_ext.Extension', 'extension', 'extension', {
        badge: 'optional',
      }),
    ],
  }),
  node('capability-request', 'message', 'CapabilityRequest', 2350, 450, 340, {
    protoUrl: proto(431),
    specUrl: spec('321-the-capabilityrequest-message'),
    fields: [
      f('extension', 'repeated gnmi_ext.Extension', 'extension', 'extension', {
        badge: 'optional',
      }),
    ],
  }),
  node('capability-response', 'message', 'CapabilityResponse', 2730, 450, 370, {
    protoUrl: proto(440),
    specUrl: spec('322-the-capabilityresponse-message'),
    fields: [
      f('supported-models', 'repeated ModelData', 'supported_models', 'model-data'),
      f('supported-encodings', 'repeated Encoding', 'supported_encodings', 'encoding'),
      f('version', 'string', 'gNMI_version'),
      f('extension', 'repeated gnmi_ext.Extension', 'extension', 'extension', {
        badge: 'optional',
      }),
    ],
  }),

  node('error', 'message', 'Error', 120, 850, 300, {
    protoUrl: proto(179),
    specUrl: spec('23-structured-data-types'),
    badges: ['deprecated'],
    fields: [
      f('code', 'uint32', 'code'),
      f('message', 'string', 'message'),
      f('data', 'google.protobuf.Any', 'data', 'any'),
    ],
  }),
  node('update-result', 'message', 'UpdateResult', 450, 820, 330, {
    protoUrl: proto(371),
    specUrl: spec('342-the-setresponse-message'),
    fields: [
      f('timestamp', 'int64', 'timestamp', null, { badge: 'deprecated' }),
      f('path', 'Path', 'path', 'path'),
      f('message', 'Error', 'message', 'error', { badge: 'deprecated' }),
      f('op', 'Operation', 'op', 'operation'),
    ],
  }),
  node('operation', 'enum', 'enum Operation', 430, 1120, 260, {
    protoUrl: proto(373),
    fields: [
      f('invalid', '0', 'INVALID'),
      f('delete', '1', 'DELETE'),
      f('replace', '2', 'REPLACE'),
      f('update', '3', 'UPDATE'),
    ],
  }),

  node('poll', 'message', 'Poll', 800, 780, 180, {
    protoUrl: proto(223),
    specUrl: spec('35153-poll-subscriptions'),
    fields: [],
  }),
  node('alias-list', 'message', 'AliasList', 720, 940, 300, {
    protoUrl: proto(328),
    specUrl: spec('3516-client-defined-aliases-within-a-subscription'),
    fields: [f('alias', 'repeated Alias', 'alias', 'alias')],
  }),
  node('alias', 'message', 'Alias', 710, 1160, 280, {
    protoUrl: proto(320),
    specUrl: spec('242-path-aliases'),
    fields: [
      f('path', 'Path', 'path', 'path'),
      f('alias', 'string', 'alias'),
    ],
  }),
  node('subscription-list', 'message', 'SubscriptionList', 1050, 750, 390, {
    protoUrl: proto(251),
    specUrl: spec('3512-the-subscriptionlist-message'),
    fields: [
      f('prefix', 'Path', 'prefix', 'path'),
      f('subscription', 'repeated Subscription', 'subscription', 'subscription'),
      f('use-aliases', 'bool', 'use_aliases'),
      f('qos', 'QOSMarking', 'qos', 'qos-marking'),
      f('mode', 'Mode', 'mode', 'mode'),
      f('allow-aggregation', 'bool', 'allow_aggregation'),
      f('use-models', 'repeated ModelData', 'use_models', 'model-data'),
      f('encoding', 'Encoding', 'encoding', 'encoding'),
      f('updates-only', 'bool', 'updates_only'),
    ],
  }),
  node('qos-marking', 'message', 'QOSMarking', 990, 1210, 270, {
    protoUrl: proto(311),
    specUrl: spec('3512-the-subscriptionlist-message'),
    fields: [f('marking', 'uint32', 'marking')],
  }),
  node('mode', 'enum', 'enum Mode', 990, 1390, 240, {
    protoUrl: proto(258),
    specUrl: spec('3512-the-subscriptionlist-message'),
    fields: [
      f('stream', '0', 'STREAM'),
      f('once', '1', 'ONCE'),
      f('poll', '2', 'POLL'),
    ],
  }),
  node('subscription', 'message', 'Subscription', 1460, 920, 360, {
    protoUrl: proto(286),
    specUrl: spec('3513-the-subscription-message'),
    fields: [
      f('path', 'Path', 'path', 'path'),
      f('mode', 'SubscriptionMode', 'mode', 'subscription-mode'),
      f('sample-interval', 'uint64', 'sample_interval'),
      f('suppress-redundant', 'bool', 'suppress_redundant'),
      f('heartbeat-interval', 'uint64', 'heartbeat_interval'),
    ],
  }),
  node('subscription-mode', 'enum', 'enum SubscriptionMode', 1460, 1250, 310, {
    protoUrl: proto(302),
    specUrl: spec('35152-stream-subscriptions'),
    fields: [
      f('target-defined', '0', 'TARGET_DEFINED'),
      f('on-change', '1', 'ON_CHANGE'),
      f('sample', '2', 'SAMPLE'),
    ],
  }),

  node('data-type', 'enum', 'enum DataType', 1660, 720, 280, {
    protoUrl: proto(399),
    specUrl: spec('331-the-getrequest-message'),
    fields: [
      f('all', '0', 'ALL'),
      f('config', '1', 'CONFIG'),
      f('state', '2', 'STATE'),
      f('operational', '3', 'OPERATIONAL'),
    ],
  }),
  node('model-data', 'message', 'ModelData', 2410, 790, 300, {
    protoUrl: proto(454),
    specUrl: spec('261-the-modeldata-message'),
    fields: [
      f('name', 'string', 'name'),
      f('organization', 'string', 'organization'),
      f('version', 'string', 'version'),
    ],
  }),
  node('encoding', 'enum', 'enum Encoding', 2380, 1120, 260, {
    protoUrl: proto(167),
    specUrl: spec('23-structured-data-types'),
    fields: [
      f('json', '0', 'JSON'),
      f('bytes', '1', 'BYTES'),
      f('proto', '2', 'PROTO'),
      f('ascii', '3', 'ASCII'),
      f('json-ietf', '4', 'JSON_IETF'),
    ],
  }),

  node('notification', 'message', 'Notification', 1740, 1160, 350, {
    protoUrl: proto(79),
    specUrl: spec('21-reusable-notification-message-format'),
    fields: [
      f('timestamp', 'int64', 'timestamp'),
      f('prefix', 'Path', 'prefix', 'path'),
      f('alias', 'string', 'alias'),
      f('update', 'repeated Update', 'update', 'update'),
      f('delete', 'repeated Path', 'delete', 'path'),
      f('atomic', 'bool', 'atomic'),
    ],
  }),
  node('update', 'message', 'Update', 1320, 1460, 330, {
    protoUrl: proto(95),
    specUrl: spec('21-reusable-notification-message-format'),
    fields: [
      f('path', 'Path', 'path', 'path'),
      f('value', 'Value', 'value', 'value', { badge: 'deprecated' }),
      f('val', 'TypedValue', 'val', 'typed-value'),
      f('duplicates', 'uint32', 'duplicates'),
    ],
  }),
  node('path', 'message', 'Path', 1780, 1530, 360, {
    protoUrl: proto(135),
    specUrl: spec('222-paths'),
    fields: [
      f('element', 'repeated string', 'element', null, { badge: 'deprecated' }),
      f('origin', 'string', 'origin'),
      f('elem', 'repeated PathElem', 'elem', 'path-elem'),
      f('target', 'string', 'target'),
    ],
  }),
  node('path-elem', 'message', 'PathElem', 2210, 1600, 330, {
    protoUrl: proto(148),
    specUrl: spec('222-paths'),
    fields: [
      f('name', 'string', 'name'),
      f('key', 'map<string,string>', 'key'),
    ],
  }),
  node('value', 'message', 'Value', 700, 1570, 300, {
    protoUrl: proto(156),
    specUrl: spec('223-node-values'),
    badges: ['deprecated'],
    fields: [
      f('value', 'bytes', 'value'),
      f('type', 'Encoding', 'type', 'encoding'),
    ],
  }),
  node('typed-value', 'message', 'TypedValue', 980, 1780, 390, {
    protoUrl: proto(104),
    fields: [
      f('string-val', 'string', 'string_val', null, { group: 'oneof value' }),
      f('int-val', 'int64', 'int_val', null, { group: 'oneof value' }),
      f('uint-val', 'uint64', 'uint_val', null, { group: 'oneof value' }),
      f('bool-val', 'bool', 'bool_val', null, { group: 'oneof value' }),
      f('bytes-val', 'bytes', 'bytes_val', null, { group: 'oneof value' }),
      f('float-val', 'float', 'float_val', null, { group: 'oneof value' }),
      f('decimal-val', 'Decimal64', 'decimal_val', 'decimal64', {
        group: 'oneof value',
      }),
      f('leaflist-val', 'ScalarArray', 'leaflist_val', 'scalar-array', {
        group: 'oneof value',
      }),
      f('any-val', 'google.protobuf.Any', 'any_val', 'any', {
        group: 'oneof value',
      }),
      f('json-val', 'bytes', 'json_val', null, { group: 'oneof value' }),
      f('json-ietf-val', 'bytes', 'json_ietf_val', null, {
        group: 'oneof value',
      }),
      f('ascii-val', 'string', 'ascii_val', null, { group: 'oneof value' }),
      f('proto-bytes', 'bytes', 'proto_bytes', null, { group: 'oneof value' }),
    ],
  }),
  node('decimal64', 'message', 'Decimal64', 1430, 1780, 280, {
    protoUrl: proto(189),
    fields: [
      f('digits', 'int64', 'digits'),
      f('precision', 'uint32', 'precision'),
    ],
  }),
  node('scalar-array', 'message', 'ScalarArray', 1430, 1980, 330, {
    protoUrl: proto(195),
    fields: [f('element', 'repeated TypedValue', 'element', 'typed-value')],
  }),
  node('any', 'external', 'google.protobuf.Any', 550, 1870, 330, {
    protoUrl: 'https://github.com/protocolbuffers/protobuf/blob/master/src/google/protobuf/any.proto',
    fields: [
      f('type-url', 'string', 'type_url'),
      f('value', 'bytes', 'value'),
    ],
  }),

  node('extension', 'message', 'gnmi_ext.Extension', 2020, 820, 360, {
    protoUrl: extProto(27),
    specUrl: spec('27-extensions-to-gnmi'),
    fields: [
      f('registered-ext', 'RegisteredExtension', 'registered_ext', 'registered-extension', {
        group: 'oneof ext',
      }),
      f('master-arbitration', 'MasterArbitration', 'master_arbitration', 'master-arbitration', {
        group: 'oneof ext',
      }),
    ],
  }),
  node('registered-extension', 'message', 'gnmi_ext.RegisteredExtension', 2510, 760, 390, {
    protoUrl: extProto(37),
    fields: [
      f('id', 'ExtensionID', 'id', 'extension-id'),
      f('msg', 'bytes', 'msg'),
    ],
  }),
  node('extension-id', 'enum', 'enum gnmi_ext.ExtensionID', 2940, 700, 310, {
    protoUrl: extProto(44),
    fields: [
      f('unset', '0', 'EID_UNSET'),
      f('experimental', '999', 'EID_EXPERIMENTAL'),
    ],
  }),
  node('master-arbitration', 'message', 'gnmi_ext.MasterArbitration', 2510, 1010, 390, {
    protoUrl: extProto(59),
    fields: [
      f('role', 'Role', 'role', 'role'),
      f('election-id', 'Uint128', 'election_id', 'uint128'),
    ],
  }),
  node('uint128', 'message', 'gnmi_ext.Uint128', 2940, 1040, 260, {
    protoUrl: extProto(65),
    fields: [
      f('high', 'uint64', 'high'),
      f('low', 'uint64', 'low'),
    ],
  }),
  node('role', 'message', 'gnmi_ext.Role', 2940, 1210, 260, {
    protoUrl: extProto(71),
    fields: [f('id', 'string', 'id')],
  }),

  node('legend', 'legend', 'Legend', 2720, 1470, 410, {
    fields: [
      f('proto', 'file icon', 'proto definition link'),
      f('docs', 'book icon', 'documentation link'),
      f('extension-note', 'toggle', 'extension relationship edges'),
      f('pdf', 'reference', 'gnmi_0.7.0_map.pdf'),
    ],
  }),
];

export const mapEdges = [
  e('service-gnmi', 'set', 'rpc-set', 'rpc'),
  e('service-gnmi', 'subscribe', 'rpc-subscribe', 'rpc'),
  e('service-gnmi', 'get', 'rpc-get', 'rpc'),
  e('service-gnmi', 'capabilities', 'rpc-capabilities', 'rpc'),

  e('rpc-set', 'takes', 'set-request', 'rpc'),
  e('rpc-set', 'returns', 'set-response', 'rpc'),
  e('rpc-subscribe', 'takes', 'subscribe-request', 'rpc'),
  e('rpc-subscribe', 'returns', 'subscribe-response', 'rpc'),
  e('rpc-get', 'takes', 'get-request', 'rpc'),
  e('rpc-get', 'returns', 'get-response', 'rpc'),
  e('rpc-capabilities', 'takes', 'capability-request', 'rpc'),
  e('rpc-capabilities', 'returns', 'capability-response', 'rpc'),

  e('set-request', 'prefix', 'path'),
  e('set-request', 'delete', 'path'),
  e('set-request', 'replace', 'update'),
  e('set-request', 'update', 'update'),
  e('set-request', 'extension', 'extension', 'extension'),
  e('set-response', 'prefix', 'path'),
  e('set-response', 'response', 'update-result'),
  e('set-response', 'message', 'error'),
  e('set-response', 'extension', 'extension', 'extension'),
  e('update-result', 'path', 'path'),
  e('update-result', 'message', 'error'),
  e('update-result', 'op', 'operation'),

  e('subscribe-request', 'subscribe', 'subscription-list'),
  e('subscribe-request', 'poll', 'poll'),
  e('subscribe-request', 'aliases', 'alias-list'),
  e('subscribe-request', 'extension', 'extension', 'extension'),
  e('subscribe-response', 'update', 'notification'),
  e('subscribe-response', 'error', 'error'),
  e('subscribe-response', 'extension', 'extension', 'extension'),
  e('alias-list', 'alias', 'alias'),
  e('alias', 'path', 'path'),
  e('subscription-list', 'prefix', 'path'),
  e('subscription-list', 'subscription', 'subscription'),
  e('subscription-list', 'qos', 'qos-marking'),
  e('subscription-list', 'mode', 'mode'),
  e('subscription-list', 'use-models', 'model-data'),
  e('subscription-list', 'encoding', 'encoding'),
  e('subscription', 'path', 'path'),
  e('subscription', 'mode', 'subscription-mode'),

  e('get-request', 'prefix', 'path'),
  e('get-request', 'path', 'path'),
  e('get-request', 'type', 'data-type'),
  e('get-request', 'encoding', 'encoding'),
  e('get-request', 'use-models', 'model-data'),
  e('get-request', 'extension', 'extension', 'extension'),
  e('get-response', 'notification', 'notification'),
  e('get-response', 'error', 'error'),
  e('get-response', 'extension', 'extension', 'extension'),
  e('capability-request', 'extension', 'extension', 'extension'),
  e('capability-response', 'supported-models', 'model-data'),
  e('capability-response', 'supported-encodings', 'encoding'),
  e('capability-response', 'extension', 'extension', 'extension'),

  e('notification', 'prefix', 'path'),
  e('notification', 'update', 'update'),
  e('notification', 'delete', 'path'),
  e('update', 'path', 'path'),
  e('update', 'value', 'value'),
  e('update', 'val', 'typed-value'),
  e('path', 'elem', 'path-elem'),
  e('value', 'type', 'encoding'),
  e('typed-value', 'decimal-val', 'decimal64'),
  e('typed-value', 'leaflist-val', 'scalar-array'),
  e('typed-value', 'any-val', 'any'),
  e('scalar-array', 'element', 'typed-value'),
  e('error', 'data', 'any'),

  e('extension', 'registered-ext', 'registered-extension', 'extension-detail'),
  e('extension', 'master-arbitration', 'master-arbitration', 'extension-detail'),
  e('registered-extension', 'id', 'extension-id', 'extension-detail'),
  e('master-arbitration', 'role', 'role', 'extension-detail'),
  e('master-arbitration', 'election-id', 'uint128', 'extension-detail'),
];

export const mapBounds = {
  width: 3300,
  height: 2220,
};
