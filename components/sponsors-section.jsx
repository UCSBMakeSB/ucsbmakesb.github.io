import Image from "next/image";
import { friends, FRIENDS_EMAIL, sponsorTiers, TIER_SCALE } from "../lib/sponsors";

export function SponsorsSection() {
  return (
    <section
      id="sponsors"
      className="page-section"
      aria-labelledby="sponsors-title"
    >
      <div className="page-section-inner sponsors-inner">
        <h2 id="sponsors-title">Thank you to our sponsors</h2>
        {sponsorTiers.map(({ tier, items }) => (
          <ul className="sponsor-row" data-tier={tier} key={tier}>
            {items.map(({ name, href, src, width, height, display }) => (
              <li key={name}>
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={name}
                >
                  <Image
                    className="sponsor-logo"
                    src={src}
                    width={width}
                    height={height}
                    alt={name}
                    style={{ "--logo-w": Math.round(display * TIER_SCALE[tier]) }}
                  />
                </a>
              </li>
            ))}
          </ul>
        ))}
        <div className="friends" aria-labelledby="friends-title">
          <h3 id="friends-title">Friends of MakeSB</h3>
          {friends.length > 0 && (
            <ul className="sponsor-row friends-row">
              {friends.map(({ name, href, src, width, height, display }) => (
                <li key={name}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={name}
                  >
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
          )}
          <p>
            <a href={`mailto:${FRIENDS_EMAIL}`}>
              Reach out to us about collaborating!
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
