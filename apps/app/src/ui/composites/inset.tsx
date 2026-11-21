import type { ReactNode } from 'react';

/** @ui Inset @spec A bordered sub-block inside a card (a goal, a thread line). @keywords inset, bordered box, sub block */
export const Inset = ({ children }: { children: ReactNode }) => <div className="flex flex-col gap-2 rounded-control border border-line px-row py-2.5">{children}</div>;

/** @ui Divider @spec A horizontal rule between parts of one card. @keywords divider, separator, rule */
export const Divider = () => <hr className="border-0 border-t border-line" />;
