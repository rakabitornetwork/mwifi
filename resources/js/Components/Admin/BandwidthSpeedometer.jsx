import { formatSpeedBps } from '../../utils/formatSpeedBps';

export default function BandwidthSpeedometer({ label, bps = 0, maxMbps = 0, type = 'down', isDarkMode = false, gaugeId = 'gauge' }) {
    const maxBps = maxMbps > 0 ? maxMbps * 1_000_000 : 0;
    const pct = maxBps > 0 ? Math.min(100, ((Number(bps) || 0) / maxBps) * 100) : 0;
    const cx = 50;
    const cy = 48;
    const radius = 36;
    const arcLength = Math.PI * radius;
    const dash = (pct / 100) * arcLength;
    const needleAngle = 180 - (pct / 100) * 180;
    const needleRad = (needleAngle * Math.PI) / 180;
    const needleLen = radius - 10;
    const needleX = cx + needleLen * Math.cos(needleRad);
    const needleY = cy - needleLen * Math.sin(needleRad);
    const stroke = type === 'down' ? '#059669' : '#2563eb';
    const strokeSoft = type === 'down' ? '#34d399' : '#60a5fa';
    const maxLabel = maxMbps > 0 ? `${maxMbps}M` : 'N/A';
    const midLabel = maxMbps > 0 ? `${Math.round(maxMbps / 2)}M` : '';
    const trackColor = isDarkMode ? '#3f3f46' : '#e4e4e7';
    const labelColor = isDarkMode ? '#a1a1aa' : '#64748b';
    const shellBg = isDarkMode
        ? 'linear-gradient(180deg, #18181b 0%, #09090b 100%)'
        : 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)';
    const shellBorder = isDarkMode ? '#27272a' : '#eef2f7';

    return (
        <div className={`map-speedometer map-speedometer--${type}`} style={{ background: shellBg, borderColor: shellBorder }}>
            <div className="map-speedometer-shell">
                <svg viewBox="0 0 100 62" className="map-speedometer-svg" aria-hidden="true">
                    <defs>
                        <linearGradient id={`${gaugeId}-grad-${type}`} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={stroke} />
                            <stop offset="100%" stopColor={strokeSoft} />
                        </linearGradient>
                    </defs>
                    <path
                        d="M 14 48 A 36 36 0 0 1 86 48"
                        fill="none"
                        stroke={trackColor}
                        strokeWidth="6"
                        strokeLinecap="round"
                        opacity="0.9"
                    />
                    <path
                        d="M 14 48 A 36 36 0 0 1 86 48"
                        fill="none"
                        stroke={`url(#${gaugeId}-grad-${type})`}
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={`${dash.toFixed(2)} ${arcLength.toFixed(2)}`}
                        className="map-speedometer-arc"
                    />
                    <line x1={cx} y1={cy} x2={needleX.toFixed(2)} y2={needleY.toFixed(2)} stroke={stroke} strokeWidth="2" strokeLinecap="round" opacity="0.85" />
                    <circle cx={cx} cy={cy} r="3" fill={isDarkMode ? '#27272a' : '#fff'} stroke={stroke} strokeWidth="1.5" />
                    <text x="8" y="58" fontSize="5.5" fill={labelColor} fontWeight="600">0</text>
                    <text x="46" y="11" fontSize="5.5" fill={labelColor} fontWeight="600">{midLabel}</text>
                    <text x="82" y="58" fontSize="5.5" fill={labelColor} fontWeight="600">{maxLabel}</text>
                </svg>
            </div>
            <p className="map-speedometer-label">{label}</p>
            <p className="map-speedometer-value">{formatSpeedBps(bps)}</p>
        </div>
    );
}
