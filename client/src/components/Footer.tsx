import { Link } from 'react-router-dom';

interface FooterColumn {
  heading: string;
  links: { label: string; to: string }[];
}

const COLUMNS: FooterColumn[] = [
  {
    heading: 'Platform',
    links: [
      { label: 'Rankings',  to: '/rankings'  },
      { label: 'Recruiting', to: '/recruiting' },
      { label: 'Explore',   to: '/explore'   },
      { label: 'Events',    to: '/events'    },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About',   to: '/about'   },
      { label: 'Contact', to: '/contact' },
      { label: 'FAQ',     to: '/faq'     },
      { label: 'Help',    to: '/help'    },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy',       to: '/privacy'       },
      { label: 'Terms',         to: '/terms'         },
      { label: 'Cookie Policy', to: '/cookies'       },
      { label: 'Accessibility', to: '/accessibility' },
    ],
  },
];

const currentYear = new Date().getFullYear();

export const Footer = () => (
  <footer className="border-t border-surface-border bg-surface">
    <div className="max-w-7xl mx-auto px-6 py-16">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-8">
        {/* Brand block */}
        <div className="col-span-2 md:col-span-1">
          <span
            className="font-display font-black text-2xl uppercase tracking-[0.04em] text-ink"
          >
            HERS 365
          </span>
          <p className="mt-3 text-sm text-ink-faint leading-relaxed">
            Where girls&apos; flag football gets recruited.
          </p>
        </div>

        {/* Link columns */}
        {COLUMNS.map((col) => (
          <nav key={col.heading} aria-label={col.heading}>
            <p className="k-label text-ink-faint mb-4">{col.heading}</p>
            <ul className="space-y-3">
              {col.links.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-ink-muted hover:text-white transition-colors duration-150"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
    </div>

    {/* Bottom bar */}
    <div className="border-t border-surface-border">
      <div className="max-w-7xl mx-auto px-6 py-5 flex items-center">
        <p className="text-sm text-ink-faint">
          &copy; {currentYear} HERS365. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
);
