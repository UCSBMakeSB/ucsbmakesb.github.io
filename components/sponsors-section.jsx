import Image from "next/image";
import { sponsors } from "../lib/sponsors";

export function SponsorsSection() {
  return (
    <section
      id="sponsors"
      className="page-section"
      aria-labelledby="sponsors-title"
    >
      <div className="page-section-inner sponsors-inner">
        <h2 id="sponsors-title">Thank you to our sponsors</h2>
        <ul className="sponsor-row">
          {sponsors.map(({ name, href, src, width, height, display }) => (
            <li key={name}>
              <a href={href} target="_blank" rel="noreferrer" aria-label={name}>
                <Image
                  className="sponsor-logo"
                  src={src}
                  width={width}
                  height={height}
                  alt={name}
                  style={{ "--logo-w": display }}
                />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
