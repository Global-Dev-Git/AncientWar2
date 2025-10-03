import type { PropsWithChildren, ReactNode } from 'react'
import './Tooltip.css'

interface TooltipProps {
  content: ReactNode
  align?: 'left' | 'right'
}

const Tooltip = ({ children, content, align = 'left' }: PropsWithChildren<TooltipProps>) => (
  <span className={`tooltip tooltip--${align}`}>
    {children}
    <span className="tooltip__bubble">{content}</span>
  </span>
)

export default Tooltip
