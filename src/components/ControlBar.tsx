'use client';
import Link from 'next/link';

interface Props {
  showFullscreen: boolean;
  uiHidden: boolean;
  onToggleUI: () => void;
  showHome?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const icon = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

export default function ControlBar({ showFullscreen, uiHidden, onToggleUI, showHome = true, isFullscreen, onToggleFullscreen }: Props) {
  // While the interface is hidden every other button fades out and the eye glides into the leftmost slot.
  const gone = uiHidden ? ({ 'aria-hidden': true, tabIndex: -1 } as const) : {};
  const before = (showHome ? 1 : 0) + (showFullscreen ? 1 : 0);
  return (
    <nav className="controls" aria-label="Viewer controls" data-hidden={uiHidden}>
      {showHome && (
        <Link href="/elevation" className="ctl" aria-label="Home" {...gone}>
          <svg {...icon}><path d="M4 11l8-7 8 7M6 10v9h12v-9" /></svg>
        </Link>
      )}
      {showFullscreen && (
        <button type="button" className="ctl" onClick={onToggleFullscreen} {...gone}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
          {isFullscreen ? (
            <svg {...icon} viewBox="7 6 21 21" stroke="none" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M13.6814 7.02211C13.5146 7.06483 13.282 7.19287 13.192 7.29149C13.1481 7.33944 13.0727 7.45389 13.0243 7.54582L12.9363 7.71297L12.9248 9.83954L12.9132 11.9661L10.8199 11.9665L8.72647 11.9669L8.5402 12.0548C8.18046 12.2246 8 12.5052 8 12.8947C8 13.2843 8.18046 13.5648 8.5402 13.7347L8.72647 13.8226L11.3762 13.823L14.0259 13.8234L14.1802 13.7691C14.4075 13.6891 14.5684 13.5511 14.6906 13.3314L14.799 13.1362V10.4246V7.71297L14.7127 7.53817C14.5244 7.1571 14.0605 6.92497 13.6814 7.02211ZM20.8065 7.08214C20.5914 7.16088 20.4283 7.30382 20.3094 7.51781L20.201 7.71297V10.4246V13.1362L20.2821 13.2873C20.3885 13.4854 20.6148 13.6861 20.8193 13.7636L20.9833 13.8258L23.6657 13.8153L26.348 13.8048L26.5006 13.7234C26.6782 13.6287 26.8757 13.4166 26.9488 13.2422C27.0228 13.0655 27.0126 12.6839 26.9291 12.5047C26.8359 12.3046 26.6073 12.0933 26.4085 12.0234L26.2456 11.9661H24.1659H22.0863L22.075 9.85812L22.0637 7.75012L21.9944 7.59196C21.9075 7.39393 21.6153 7.12812 21.4206 7.06995C21.2294 7.01282 20.9823 7.01773 20.8065 7.08214ZM8.5402 19.261C8.18046 19.4308 8 19.7114 8 20.1009C8 20.4904 8.18046 20.771 8.5402 20.9409L8.72647 21.0288L10.8201 21.0292L12.9137 21.0296L12.925 23.1561L12.9363 25.2827L13.0034 25.4313C13.3364 26.1689 14.3301 26.1946 14.7155 25.4756L14.799 25.3199L14.8095 22.6869L14.82 20.0539L14.7598 19.8453L14.6995 19.6366L14.5071 19.4501C14.3897 19.3363 14.2549 19.2458 14.1614 19.218L14.008 19.1723L11.3672 19.1727L8.72647 19.173L8.5402 19.261ZM20.7874 19.2393C20.5929 19.3165 20.3929 19.5017 20.2833 19.7061L20.201 19.8595V22.5897V25.3199L20.2845 25.4756C20.6699 26.1946 21.6636 26.1689 21.9966 25.4313L22.0637 25.2827L22.075 23.1561L22.0863 21.0296L24.1799 21.0292L26.2735 21.0288L26.4598 20.9409C26.8195 20.771 27 20.4904 27 20.1009C27 19.7114 26.8195 19.4308 26.4598 19.261L26.2735 19.173L23.6098 19.1747L20.9461 19.1764L20.7874 19.2393Z" />
            </svg>
          ) : (
            <svg {...icon}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
          )}
        </button>
      )}
      <button type="button" className="ctl eye" onClick={onToggleUI} style={{ ['--shift' as string]: before }}
        aria-label={uiHidden ? 'Show interface' : 'Hide interface'} aria-pressed={uiHidden}>
        <svg {...icon}>
          <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
          {uiHidden && <path d="M4 4l16 16" />}
        </svg>
      </button>
    </nav>
  );
}
