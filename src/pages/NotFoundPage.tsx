import { ButtonLink } from '../components/common/Button'
import { EmptyState } from '../components/feedback/States'
export function NotFoundPage(){return <main className="not-found"><EmptyState title="Không tìm thấy trang" description="Địa chỉ không tồn tại hoặc dữ liệu bạn yêu cầu không còn khả dụng." primaryAction={<ButtonLink to="/">Về trang chủ</ButtonLink>}/></main>}
