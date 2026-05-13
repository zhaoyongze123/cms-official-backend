export type PrimitiveSize = 'sm' | 'md' | 'lg';

export interface PrimitivePlaceholder {
  name: string;
  size?: PrimitiveSize;
}

export const primitivePlaceholder = {
  name: 'primitive-placeholder',
  size: 'md',
} as const satisfies PrimitivePlaceholder;
