// Designer's compass rose with fixed N S E W markers and a rotating radar compass that tracks the view heading.
// ponytail: fixed SVG housing + rotating inner dial (radar cone + needle); lightweight, zero dependencies.
export default function Compass({ heading }: { heading: number }) {
  return (
    <div className="compass radar" role="img" aria-label={`Compass, facing ${Math.round(((heading % 360) + 360) % 360)} degrees`}>
      <svg viewBox="-64 -11 520 520" fill="white" aria-hidden="true">
        <defs>
          <filter id="compassDropShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="5" stdDeviation="8" floodColor="#000000" floodOpacity="0.55" />
          </filter>
          <filter id="radarFrostedGlass" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <radialGradient id="radarYellowShader" cx="196" cy="249.215" r="194" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#C5A262" stopOpacity="0.85" />
            <stop offset="30%" stopColor="#D9B25C" stopOpacity="0.65" />
            <stop offset="65%" stopColor="#C5A262" stopOpacity="0.38" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0.5)" stopOpacity="0.15" />
          </radialGradient>
          <linearGradient id="radarArcStroke" x1="99" y1="81.2" x2="293" y2="81.2" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#C5A262" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#FFE08A" stopOpacity="1" />
            <stop offset="100%" stopColor="#C5A262" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* FIXED outer frame: circular corner arcs and N, S, E, W markers */}
        <g className="compass-fixed" filter="url(#compassDropShadow)">
          {/* Corner arcs */}
          <path d="M162.547 415.8C162.256 415.8 161.959 415.773 161.662 415.707C145.328 412.357 129.61 406.615 114.948 398.64C100.584 390.831 87.4218 380.992 75.8259 369.396C64.23 357.8 54.3917 344.639 46.5818 330.274C38.6068 315.606 32.865 299.887 29.5151 283.56C29.0327 281.195 30.5524 278.889 32.9178 278.407C35.2767 277.924 37.5892 279.444 38.0716 281.809C51.0352 344.995 100.24 394.194 163.426 407.164C165.791 407.646 167.311 409.959 166.829 412.318C166.406 414.386 164.589 415.806 162.554 415.806L162.547 415.8Z" />
          <path d="M358.21 220.123C356.182 220.123 354.358 218.703 353.935 216.635C340.972 153.449 291.767 104.251 228.581 91.2803C226.216 90.798 224.696 88.4854 225.178 86.1266C225.66 83.7612 227.973 82.2415 230.332 82.7238C246.665 86.0737 262.384 91.8155 277.046 99.7906C291.41 107.6 304.572 117.439 316.168 129.035C327.764 140.631 337.602 153.792 345.412 168.157C353.387 182.825 359.129 198.544 362.479 214.871C362.961 217.236 361.441 219.542 359.076 220.024C358.779 220.084 358.481 220.117 358.19 220.117L358.21 220.123Z" />
          <path d="M229.46 415.8C227.431 415.8 225.608 414.379 225.185 412.311C224.703 409.946 226.222 407.64 228.588 407.157C291.774 394.194 340.972 344.989 353.942 281.803C354.424 279.437 356.737 277.918 359.096 278.4C361.461 278.882 362.981 281.195 362.499 283.554C359.149 299.887 353.407 315.606 345.432 330.268C337.622 344.632 327.784 357.794 316.188 369.39C304.592 380.986 291.43 390.824 277.066 398.634C262.397 406.609 246.679 412.351 230.352 415.701C230.055 415.76 229.757 415.793 229.467 415.793L229.46 415.8Z" />
          <path d="M33.7964 220.123C33.5057 220.123 33.2083 220.097 32.911 220.031C30.5456 219.549 29.0259 217.236 29.5082 214.877C32.8582 198.544 38.5999 182.825 46.575 168.163C54.3849 153.799 64.2232 140.637 75.819 129.041C87.4149 117.445 100.577 107.607 114.941 99.7971C129.609 91.8221 145.328 86.0803 161.655 82.7304C164.014 82.2481 166.326 83.7678 166.809 86.1332C167.291 88.4986 165.771 90.8046 163.406 91.2869C100.22 104.25 51.0217 153.455 38.0515 216.641C37.6287 218.709 35.8116 220.13 33.7766 220.13L33.7964 220.123Z" />
          {/* North marker */}
          <path d="M204.65 28.8476L190.642 0H181.563V39.3731H188.66V10.9682L202.621 39.3731H211.752V0H204.65V28.8476Z" />
          {/* South, East, West labels */}
          <g fontFamily="'Source Sans 3', sans-serif" fontSize="54" fontWeight="600" textAnchor="middle" dominantBaseline="central">
            <text x="196" y="478">S</text>
            <text x="425" y="249">E</text>
            <text x="-33" y="249">W</text>
          </g>
        </g>

        {/* ROTATING radar and compass star: follows the view heading */}
        <g data-dial style={{ transform: `rotate(${heading}deg)`, transformOrigin: '196px 249.215px' }}>
          {/* Radar field-of-view cone with yellow shaders & frosted glass effect */}
          <g className="radar-beam" filter="url(#compassDropShadow)">
            <g filter="url(#radarFrostedGlass)">
              <path d="M 196 249.215 L 99 81.2 A 194 194 0 0 1 293 81.2 Z" fill="url(#radarYellowShader)" stroke="url(#radarArcStroke)" strokeWidth="2" />
              <path d="M 147.5 165.2 A 97 97 0 0 1 244.5 165.2" fill="none" stroke="#FFDE8A" strokeWidth="1.2" strokeDasharray="4 3" strokeOpacity="0.7" />
              <line x1="196" y1="249.215" x2="196" y2="55.2" stroke="#FFF0B3" strokeWidth="1.5" strokeOpacity="0.9" />
              <circle cx="196" cy="249.215" r="4.5" fill="#FFE08A" opacity="1" />
            </g>
          </g>

          {/* Compass rose needle pointers with 55% drop shadow */}
          <g className="compass-rose" filter="url(#compassDropShadow)">
            <path d="M389.859 246.401L240.137 205.078L196 249.215L240.137 293.353L389.859 252.03C392.714 251.244 392.714 247.187 389.859 246.401ZM240.137 287.842L204.781 249.215H380.08L240.137 287.842Z" />
            <path d="M151.863 205.078L2.14078 246.401C-0.713592 247.187 -0.713592 251.244 2.14078 252.03L151.863 293.353L196 249.215L151.863 205.078ZM11.9196 249.215L151.863 210.589L187.219 249.215H11.9196Z" />
            <path d="M196 249.215L151.863 293.352L193.186 443.075C193.972 445.929 198.029 445.929 198.815 443.075L240.137 293.352L196 249.215ZM196 433.302L157.374 293.359L196 258.003V433.302Z" />
            <path d="M198.815 55.3629C198.029 52.5086 193.972 52.5086 193.186 55.3629L151.863 205.085L196 249.222L240.137 205.085L198.815 55.3629ZM196 65.1352L234.627 205.079L196 240.434V65.1352Z" />
          </g>
        </g>
      </svg>
    </div>
  );
}
