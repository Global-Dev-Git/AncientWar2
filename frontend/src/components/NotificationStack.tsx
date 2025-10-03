import type { NotificationEntry } from '../game/types'
import './NotificationStack.css'

interface NotificationStackProps {
  notifications: NotificationEntry[]
}

export const NotificationStack = ({ notifications }: NotificationStackProps) => (
  <div className="notification-stack">
    {notifications.map((notification) => (
      <div key={notification.id} className={`notification notification--${notification.tone}`}>
        {notification.message}
      </div>
    ))}
  </div>
)

export default NotificationStack
