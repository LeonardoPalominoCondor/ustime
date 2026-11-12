import React from 'react'
export const Seg = ({ tabs, value, onChange }) => <div className="seg" role="tablist">{tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={value === k} className={value === k ? 'on' : ''} onClick={() => onChange(k)}>{l}</button>)}</div>
export const Bar = ({ label, icon, v, color }) => (
  <div className="need"><small>{icon} {label}</small><div className="bar" role="progressbar" aria-valuenow={v} aria-valuemin="0" aria-valuemax="100"><i style={{ width: v + '%', background: color || (v < 25 ? '#ff6b6b' : v < 50 ? 'var(--gold)' : 'var(--ok)') }} /></div><b>{v}</b></div>
)
export const Loading = ({ text }) => <div className="center"><div className="spinner" />{text && <p className="muted">{text}</p>}</div>
