import type { ReactNode } from "react";
import { Reveal } from "@/components/Reveal";
import styles from "./Section.module.css";

/** Eyebrow + weight-300 display title (+ optional right-aligned sub copy). */
export function SectionHeader({
  id,
  eyebrow,
  title,
  sub,
}: {
  id: string; // used for aria-labelledby: `${id}-title`
  eyebrow: string;
  title: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <Reveal as="header" className={styles.head}>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={`${id}-title`} className={styles.title}>
          {title}
        </h2>
      </div>
      {sub && <p className={styles.sub}>{sub}</p>}
    </Reveal>
  );
}

export { styles as sectionStyles };
