import type { MapField, MapNode } from './gnmiMap';

export const nodeHeaderHeight = 36;
export const nodeBodyPadding = 8;
export const nodeBadgeHeight = 24;
export const baseFieldRowHeight = 32;
export const detailFieldRowHeight = 52;
export const layoutGapX = 8;
export const layoutGapY = 18;

const maxLayoutPasses = 50;

export type LayoutBox = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LayoutBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function mapNodeWidth(node: MapNode): number {
  const width = node.style?.width;

  if (typeof width === 'number') {
    return width;
  }

  if (typeof width === 'string') {
    const parsedWidth = Number.parseFloat(width);
    return Number.isFinite(parsedWidth) ? parsedWidth : 320;
  }

  return 320;
}

export function mapFieldRowHeight(field?: MapField): number {
  if (!field) {
    return baseFieldRowHeight;
  }

  return field.group || field.badge ? detailFieldRowHeight : baseFieldRowHeight;
}

export function estimatedMapNodeHeight(node: MapNode): number {
  const fields = node.data.fields ?? [];
  const badgeHeight = node.data.badges?.length ? nodeBadgeHeight : 0;
  const fieldsHeight = fields.length
    ? fields.reduce((height, field) => height + mapFieldRowHeight(field), 0)
    : baseFieldRowHeight;

  return nodeHeaderHeight + badgeHeight + nodeBodyPadding * 2 + fieldsHeight;
}

function boxesOverlap(first: LayoutBox, second: LayoutBox): boolean {
  return (
    first.x < second.x + second.width + layoutGapX &&
    first.x + first.width + layoutGapX > second.x &&
    first.y < second.y + second.height + layoutGapY &&
    first.y + first.height + layoutGapY > second.y
  );
}

export function improveNodeLayout(nodes: MapNode[]): MapNode[] {
  const boxes = new Map<string, LayoutBox>(
    nodes.map((node) => [
      node.id,
      {
        id: node.id,
        x: node.position.x,
        y: node.position.y,
        width: mapNodeWidth(node),
        height: estimatedMapNodeHeight(node),
      },
    ]),
  );

  for (let pass = 0; pass < maxLayoutPasses; pass += 1) {
    let moved = false;
    const sortedBoxes = [...boxes.values()].sort((first, second) => {
      if (first.y !== second.y) {
        return first.y - second.y;
      }

      return first.x - second.x;
    });

    for (let index = 0; index < sortedBoxes.length; index += 1) {
      const anchor = sortedBoxes[index];

      for (let nextIndex = index + 1; nextIndex < sortedBoxes.length; nextIndex += 1) {
        const candidate = sortedBoxes[nextIndex];

        if (candidate.y >= anchor.y + anchor.height + layoutGapY) {
          break;
        }

        if (!boxesOverlap(anchor, candidate)) {
          continue;
        }

        const nextY = anchor.y + anchor.height + layoutGapY;
        if (candidate.y < nextY) {
          candidate.y = nextY;
          moved = true;
        }
      }
    }

    if (!moved) {
      break;
    }
  }

  return nodes.map((node) => {
    const box = boxes.get(node.id);
    if (!box || (box.x === node.position.x && box.y === node.position.y)) {
      return node;
    }

    return {
      ...node,
      position: {
        x: box.x,
        y: box.y,
      },
    };
  });
}

export function mapNodesBounds(nodes: MapNode[]): LayoutBounds {
  if (!nodes.length) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const minX = Math.min(...nodes.map((node) => node.position.x));
  const minY = Math.min(...nodes.map((node) => node.position.y));
  const maxX = Math.max(...nodes.map((node) => node.position.x + mapNodeWidth(node)));
  const maxY = Math.max(...nodes.map((node) => node.position.y + estimatedMapNodeHeight(node)));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
