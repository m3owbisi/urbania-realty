import { useProject } from '@/hooks/useProject';
import { TVRC_MARK } from './tvrcMark';

export default function Watermark() {
  const { label, url } = useProject().brand.watermark;
  return (
    <a className="watermark" href={url} target="_blank" rel="noopener noreferrer"
      aria-label={`Visit ${label} website (opens in a new tab)`} title={`Visit ${label}`}>
      <span className="tvrc" role="img" aria-label={`Produced by ${label}`}>
        <svg className="tvrc__mark" viewBox="543 247 271 143" aria-hidden="true" focusable="false"
          dangerouslySetInnerHTML={{ __html: TVRC_MARK }} />
        <span className="tvrc__word" aria-hidden="true">{label}</span>
      </span>
    </a>
  );
}
