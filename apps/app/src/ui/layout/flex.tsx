import type { ElementType, JSX } from 'react';
import { cn } from '@/lib/cn';

/**
 * @ui FlexBox / FlexRow / FlexUl / FlexLi / FlexForm / FlexSection
 * @spec Layout only: direction, gap (named scale), align, justify, wrap, fill. Look goes in className or a named component.
 * @keywords flex, stack, row, column, gap, layout
 */
const GAP = { none: 'gap-0', xs: 'gap-1', sm: 'gap-2', md: 'gap-3', lg: 'gap-4', xl: 'gap-6' } as const;
const DIR = { row: 'flex-row', col: 'flex-col' } as const;
const ALIGN = { start: 'items-start', center: 'items-center', end: 'items-end', baseline: 'items-baseline', stretch: 'items-stretch' } as const;
const JUSTIFY = { start: 'justify-start', center: 'justify-center', end: 'justify-end', between: 'justify-between' } as const;

export type FlexLayout = {
  dir?: keyof typeof DIR;
  gap?: keyof typeof GAP;
  align?: keyof typeof ALIGN;
  justify?: keyof typeof JUSTIFY;
  wrap?: boolean;
  fill?: boolean;
};

export function flexCls(p: FlexLayout, className?: string): string {
  return cn(
    'flex',
    DIR[p.dir ?? 'col'],
    p.gap !== undefined && GAP[p.gap],
    p.align && ALIGN[p.align],
    p.justify && JUSTIFY[p.justify],
    p.wrap && 'flex-wrap',
    p.fill && 'min-w-0 flex-1',
    className,
  );
}

function createFlex<T extends keyof JSX.IntrinsicElements>(tag: T, defaults: FlexLayout = {}) {
  return function Flex({ dir, gap, align, justify, wrap, fill, className, ...rest }: FlexLayout & JSX.IntrinsicElements[T]) {
    const C = tag as ElementType;
    return (
      <C
        className={flexCls({ dir: dir ?? defaults.dir, gap: gap ?? defaults.gap, align: align ?? defaults.align, justify: justify ?? defaults.justify, wrap, fill }, className as string)}
        {...rest}
      />
    );
  };
}

export const FlexBox = createFlex('div');
export const FlexRow = createFlex('div', { dir: 'row', align: 'center', gap: 'sm' });
export const FlexUl = createFlex('ul');
export const FlexLi = createFlex('li', { dir: 'row', align: 'center', gap: 'sm' });
export const FlexForm = createFlex('form');
export const FlexSection = createFlex('section');
