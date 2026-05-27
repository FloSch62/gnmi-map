import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import {
  getVisibleMap,
  mapBounds,
  mapSource,
  type MapEdge,
  type MapEdgeKind,
  type MapNode,
  type MapNodeKind,
} from '../src/gnmiMap';

const outputPath = path.resolve('gnmi_0.10.0_map.pdf');
const publicOutputPath = path.resolve('public/gnmi_0.10.0_map.pdf');
const margin = 56;
const pageWidth = mapBounds.width + margin * 2;
const pageHeight = mapBounds.height + margin * 2;
const headerHeight = 42;
const rowHeight = 29;
const bodyPadding = 8;

const colors = {
  background: '#f4f6f8',
  panel: '#ffffff',
  panelSoft: '#f8fafc',
  border: '#b8c5d3',
  text: '#172033',
  muted: '#677486',
  blue: '#0b4b8f',
  rpc: '#1c62a0',
  teal: '#16736b',
  amber: '#a15c03',
  gray: '#4d5a6b',
  reserved: '#e7ebf0',
  deprecated: '#fee2df',
};

type Point = {
  x: number;
  y: number;
};

const headerColors: Record<MapNodeKind, string> = {
  service: colors.blue,
  rpc: colors.rpc,
  enum: colors.amber,
  external: colors.gray,
  legend: colors.gray,
  message: colors.teal,
};

const edgeColors: Record<MapEdgeKind, string> = {
  rpc: '#0b4b8f',
  field: '#5b708a',
  extension: '#8a6a1f',
  'extension-detail': '#b47a18',
};

function nodeWidth(node: MapNode): number {
  const width = node.style?.width;
  return typeof width === 'number' ? width : 320;
}

function nodeHeight(node: MapNode): number {
  const fields = node.data.fields ?? [];
  const badgeHeight = node.data.badges?.length ? 24 : 0;
  const rows = Math.max(fields.length, 1);
  return headerHeight + badgeHeight + bodyPadding * 2 + rows * rowHeight;
}

function sourcePoint(node: MapNode, handleId: string): Point {
  const fields = node.data.fields ?? [];
  const index = Math.max(
    0,
    fields.findIndex((field) => field.id === handleId),
  );
  const y =
    node.position.y +
    headerHeight +
    (node.data.badges?.length ? 24 : 0) +
    bodyPadding +
    index * rowHeight +
    rowHeight / 2;

  return {
    x: node.position.x + nodeWidth(node),
    y,
  };
}

function targetPoint(node: MapNode): Point {
  return {
    x: node.position.x,
    y: node.position.y + nodeHeight(node) / 2,
  };
}

function trimText(value: string, limit: number): string {
  if (value.length <= limit) {
    return value;
  }

  return `${value.slice(0, limit - 1)}...`;
}

function drawArrow(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  angle: number,
  color: string,
): void {
  const size = 8;
  doc
    .save()
    .fillColor(color)
    .moveTo(x, y)
    .lineTo(
      x - size * Math.cos(angle - Math.PI / 6),
      y - size * Math.sin(angle - Math.PI / 6),
    )
    .lineTo(
      x - size * Math.cos(angle + Math.PI / 6),
      y - size * Math.sin(angle + Math.PI / 6),
    )
    .closePath()
    .fill()
    .restore();
}

function drawEdge(
  doc: PDFKit.PDFDocument,
  edge: MapEdge,
  nodesById: Map<string, MapNode>,
): void {
  const source = nodesById.get(edge.source);
  const target = nodesById.get(edge.target);
  if (!source || !target) {
    return;
  }

  const start = sourcePoint(source, edge.sourceHandle);
  const end = targetPoint(target);
  const color = edgeColors[edge.kind] ?? edgeColors.field;
  const dx = Math.max(90, Math.abs(end.x - start.x) * 0.38);
  const c1 = { x: start.x + dx, y: start.y };
  const c2 = { x: end.x - dx, y: end.y };

  doc.save();
  doc.lineWidth(edge.kind === 'rpc' ? 2.2 : 1.4).strokeColor(color).opacity(0.78);
  if (edge.kind === 'extension') {
    doc.dash(8, { space: 6 });
  }
  doc
    .moveTo(start.x + margin, start.y + margin)
    .bezierCurveTo(
      c1.x + margin,
      c1.y + margin,
      c2.x + margin,
      c2.y + margin,
      end.x + margin,
      end.y + margin,
    )
    .stroke();
  doc.undash();
  doc.opacity(1);
  drawArrow(
    doc,
    end.x + margin,
    end.y + margin,
    Math.atan2(end.y - c2.y, end.x - c2.x),
    color,
  );
  doc.restore();
}

function drawBadge(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  color: string,
  fill: string,
): number {
  const width = Math.max(46, doc.widthOfString(text) + 12);
  doc
    .save()
    .fillColor(fill)
    .roundedRect(x, y, width, 16, 8)
    .fill()
    .fillColor(color)
    .font('Helvetica-Bold')
    .fontSize(6.8)
    .text(text.toUpperCase(), x + 6, y + 5, { lineBreak: false })
    .restore();
  return width;
}

function drawNode(doc: PDFKit.PDFDocument, node: MapNode): void {
  const x = node.position.x + margin;
  const y = node.position.y + margin;
  const width = nodeWidth(node);
  const height = nodeHeight(node);
  const fields = node.data.fields ?? [];
  const headerColor = headerColors[node.data.kind] ?? colors.teal;

  doc
    .save()
    .fillColor(colors.panel)
    .roundedRect(x, y, width, height, 8)
    .fill()
    .lineWidth(1)
    .strokeColor(colors.border)
    .roundedRect(x, y, width, height, 8)
    .stroke()
    .restore();

  doc
    .save()
    .fillColor(headerColor)
    .roundedRect(x, y, width, headerHeight, 8)
    .fill()
    .rect(x, y + headerHeight - 8, width, 8)
    .fill()
    .restore();

  const kindLabel = node.data.kind.toUpperCase();
  doc
    .font('Helvetica-Bold')
    .fontSize(7)
    .fillColor('#dbeafe')
    .text(kindLabel, x + 10, y + 9, { lineBreak: false });

  doc
    .font('Helvetica-Bold')
    .fontSize(13)
    .fillColor('#ffffff')
    .text(trimText(node.data.label, 38), x + 10, y + 22, {
      width: width - 72,
      lineBreak: false,
    });

  let linkX = x + width - 52;
  if (node.data.protoUrl) {
    doc
      .roundedRect(linkX, y + 10, 18, 18, 4)
      .fillOpacity(0.18)
      .fillColor('#ffffff')
      .fill()
      .fillOpacity(1)
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#ffffff')
      .text('P', linkX + 6, y + 15, { lineBreak: false });
    doc.link(linkX, y + 10, 18, 18, node.data.protoUrl);
    linkX += 23;
  }

  if (node.data.specUrl) {
    doc
      .roundedRect(linkX, y + 10, 18, 18, 4)
      .fillOpacity(0.18)
      .fillColor('#ffffff')
      .fill()
      .fillOpacity(1)
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#ffffff')
      .text('D', linkX + 6, y + 15, { lineBreak: false });
    doc.link(linkX, y + 10, 18, 18, node.data.specUrl);
  }

  let rowY = y + headerHeight + bodyPadding;

  if (node.data.badges?.length) {
    let badgeX = x + 10;
    for (const badge of node.data.badges) {
      badgeX += drawBadge(doc, badge, badgeX, rowY, '#9b1c15', colors.deprecated) + 6;
    }
    rowY += 24;
  }

  if (!fields.length) {
    doc
      .font('Helvetica-Oblique')
      .fontSize(10)
      .fillColor(colors.muted)
      .text('empty message', x + 12, rowY + 8, { lineBreak: false });
    return;
  }

  fields.forEach((field, index) => {
    const currentY = rowY + index * rowHeight;
    if (index % 2 === 0) {
      doc
        .save()
        .fillColor(colors.panelSoft)
        .roundedRect(x + 8, currentY, width - 16, rowHeight - 2, 5)
        .fill()
        .restore();
    }

    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor(colors.muted)
      .text(trimText(field.type, 26), x + 14, currentY + 7, {
        width: Math.floor(width * 0.43),
        lineBreak: false,
      });

    const nameX = x + Math.floor(width * 0.46);
    doc
      .font('Courier-Bold')
      .fontSize(8.5)
      .fillColor(colors.text)
      .text(trimText(field.name, 31), nameX, currentY + 7, {
        width: width - (nameX - x) - 24,
        lineBreak: false,
      });

    if (field.badge) {
      const fill = field.badge === 'reserved' ? colors.reserved : colors.deprecated;
      const textColor = field.badge === 'reserved' ? colors.gray : '#9b1c15';
      drawBadge(doc, field.badge, x + width - 70, currentY + 6, textColor, fill);
    }
  });
}

async function main() {
  const { nodes: pdfNodes, edges: pdfEdges } = getVisibleMap({
    showDeprecated: false,
    showExtensions: true,
  });
  const nodesById = new Map<string, MapNode>(pdfNodes.map((node) => [node.id, node]));
  const doc = new PDFDocument({
    autoFirstPage: false,
    compress: true,
    info: {
      Title: `gNMI service ${mapSource.gnmiServiceVersion} React Flow Map`,
      Author: 'gnmi-map',
      Subject: `Generated from openconfig/gnmi ${mapSource.gnmiTag} protobuf IDL`,
      Keywords: 'gNMI, OpenConfig, React Flow, protobuf',
    },
  });

  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);
  doc.addPage({ size: [pageWidth, pageHeight], margin: 0 });

  doc.rect(0, 0, pageWidth, pageHeight).fill(colors.background);

  doc
    .font('Helvetica-Bold')
    .fontSize(26)
    .fillColor(colors.text)
    .text(`gNMI service ${mapSource.gnmiServiceVersion} map`, margin, 18, { lineBreak: false });
  doc
    .font('Helvetica')
    .fontSize(12)
    .fillColor(colors.muted)
    .text(`Generated from openconfig/gnmi ${mapSource.gnmiTag} protobuf IDL`, margin, 48, {
      lineBreak: false,
    });

  for (const edge of pdfEdges) {
    drawEdge(doc, edge, nodesById);
  }

  for (const node of pdfNodes) {
    drawNode(doc, node);
  }

  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor(colors.muted)
    .text('P = proto definition, D = specification documentation', margin, pageHeight - 32, {
      lineBreak: false,
    });

  doc.end();
  await new Promise<void>((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  fs.mkdirSync(path.dirname(publicOutputPath), { recursive: true });
  fs.copyFileSync(outputPath, publicOutputPath);

  console.log(`Wrote ${outputPath}`);
  console.log(`Wrote ${publicOutputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
