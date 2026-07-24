import { CalendarClock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AuctionCard } from '../../components/auction/AuctionCard'
import { auctions } from '../../services/mock/auctionService'
export function UpcomingPage(){const items=auctions.filter(x=>x.status==='REGISTRATION_OPEN'||x.status==='PUBLISHED');return <div className="container page-shell"><div className="page-heading"><CalendarClock/><span className="eyebrow">LỊCH SẮP TỚI</span><h1>Chuẩn bị trước khi phiên bắt đầu</h1><p>Hoàn tất điều kiện đúng hạn hoặc đăng ký nhận thông báo.</p></div><div className="auction-list-grid three">{items.map(x=><AuctionCard key={x.id} auction={x}/>)}</div><div className="center-action"><Link className="button secondary" to="/account/notifications">Quản lý thông báo</Link></div></div>}
