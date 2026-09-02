import React from 'react';

export default function Badge({ type = 'neutral', children, style = {} }) {
  return (
    <span className={`badge badge-${type}`} style={style}>
      {children}
    </span>
  );
}
