export default function Compass({ heading }: { heading: number }) {
  return (
    <div className="compass" role="img" aria-label={`Compass, facing ${Math.round(((heading % 360) + 360) % 360)} degrees`}>
      <div data-dial style={{ transform: `rotate(${-heading}deg)` }}>
        <span className="n">N</span><span className="e">E</span><span className="s">S</span><span className="w">W</span>
      </div>
      <i className="needle" />
    </div>
  );
}
