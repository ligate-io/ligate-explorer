// Pretty-print JSON with brand-coloured tokens.

import { Fragment, type ReactNode } from 'react'

type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json }

function render(value: unknown, indent: number): ReactNode {
  const pad = '  '.repeat(indent)
  if (value === null) return <span className="json-null">null</span>
  if (typeof value === 'string') return <span className="json-str">"{value}"</span>
  if (typeof value === 'number') return <span className="json-num">{value}</span>
  if (typeof value === 'boolean')
    return <span className="json-num">{String(value)}</span>
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="json-punct">[]</span>
    return (
      <>
        <span className="json-punct">[</span>
        {'\n'}
        {value.map((v, i) => (
          <Fragment key={i}>
            {pad}
            {'  '}
            {render(v, indent + 1)}
            {i < value.length - 1 ? <span className="json-punct">,</span> : null}
            {'\n'}
          </Fragment>
        ))}
        {pad}
        <span className="json-punct">]</span>
      </>
    )
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value as object)
    if (keys.length === 0) return <span className="json-punct">{'{}'}</span>
    return (
      <>
        <span className="json-punct">{'{'}</span>
        {'\n'}
        {keys.map((k, i) => (
          <Fragment key={k}>
            {pad}
            {'  '}
            <span className="json-key">"{k}"</span>
            <span className="json-punct">: </span>
            {render((value as Record<string, unknown>)[k], indent + 1)}
            {i < keys.length - 1 ? <span className="json-punct">,</span> : null}
            {'\n'}
          </Fragment>
        ))}
        {pad}
        <span className="json-punct">{'}'}</span>
      </>
    )
  }
  return <span className="json-null">unknown</span>
}

export function JsonViewer({ data }: { data: Json | unknown }) {
  return <div className="json-block">{render(data, 0)}</div>
}
