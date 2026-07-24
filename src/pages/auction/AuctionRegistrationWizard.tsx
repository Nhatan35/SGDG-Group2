import { CheckCircle2, ChevronLeft, FileText, ShieldCheck, X } from 'lucide-react'
import { type ReactNode, type RefObject, useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { catalogAuctions } from '../../services/mock/auctionService'
import { formatMoney } from '../../utils/format'
import '../../styles/auction-registration.css'
import '../../styles/auction-registration-overlays.css'

const steps = [
  ['summary', 'Tóm tắt phiên'],
  ['eligibility', 'Điều kiện tham gia'],
  ['rules', 'Xác nhận quy tắc'],
  ['review', 'Kiểm tra và gửi'],
] as const

const ruleVersion = 'QD-2026.07'
const snapshot = '18/07/2026, 09:00 GMT+7'
const deadline = '19/07/2026, 17:00 GMT+7'
const startsAt = '20/07/2026, 09:00 GMT+7'
const endsAt = '20/07/2026, 17:30 GMT+7'

type Scenario = 'eligible' | 'manual-review' | 'blocked-kyc' | 'deposit-missing'
type Auction = typeof catalogAuctions[number]

function Metadata({ label, children }: { label: string; children: ReactNode }) {
  return <div className="registration-metadata"><dt>{label}</dt><dd>{children}</dd></div>
}

function RegistrationSummaryStep({ auction, acknowledged, onAcknowledge }: { auction: Auction; acknowledged: boolean; onAcknowledge: (value: boolean) => void }) {
  return <>
    <p className="registration-eyebrow">BƯỚC 1 / 4</p><h2>Kiểm tra phiên bạn muốn đăng ký</h2>
    <p className="registration-support">Xác nhận thông tin phiên, thời hạn và các điều kiện chính trước khi tiếp tục.</p>
    <section className="registration-section"><h3>Thông tin phiên</h3><dl className="registration-metadata-grid">
      <Metadata label="Tài sản">{auction.assetName}</Metadata><Metadata label="Mã phiên">{auction.code}</Metadata>
      <Metadata label="Danh mục">Trang sức</Metadata><Metadata label="Giá khởi điểm">{formatMoney(auction.startPrice)}</Metadata>
      <Metadata label="Hạn đăng ký">{deadline}</Metadata><Metadata label="Thời gian bắt đầu">{startsAt}</Metadata>
      <Metadata label="Phiên bản quy tắc">{ruleVersion}</Metadata>
    </dl></section>
    <section className="registration-section"><h3>Điều kiện chính</h3><div className="registration-trust-grid">
      {['Thành viên và KYC sẽ được kiểm tra bằng tham chiếu mock.', 'Khoản bảo đảm được đọc từ Financial Mock.', 'Quy tắc phiên là bản snapshot chỉ đọc.', 'Gửi đăng ký chưa đồng nghĩa được phê duyệt.'].map((copy) => <div className="registration-trust-item" key={copy}><ShieldCheck/><p>{copy}</p></div>)}
    </div></section>
    
    <label className="registration-ack"><input type="checkbox" checked={acknowledged} onChange={(event) => onAcknowledge(event.target.checked)} /> Tôi xác nhận đây là phiên đấu giá tôi muốn đăng ký.</label>
    {!acknowledged && <p className="registration-validation">Vui lòng xác nhận đúng phiên đấu giá trước khi tiếp tục.</p>}
  </>
}

function RegistrationEligibilityStep({ scenario }: { scenario: Scenario }) {
  const override = scenario === 'manual-review' ? 1 : scenario === 'blocked-kyc' ? 1 : scenario === 'deposit-missing' ? 3 : -1
  const items = [
    ['Tài khoản thành viên', 'Đã xác minh', 'Membership Mock xác nhận tài khoản đang hoạt động và đủ điều kiện sử dụng dịch vụ.', 'Membership Management Mock', 'MBR-•••-1048'],
    ['KYC và danh tính', 'Hồ sơ phù hợp', 'Tham chiếu KYC hiện đáp ứng yêu cầu của phiên đấu giá.', 'Membership Management Mock', 'KYC-•••-2817'],
    ['Hạn chế tham gia', 'Không có hạn chế', 'Không có trạng thái giới hạn hoặc thu hồi quyền tham gia tại snapshot hiện tại.', 'Membership Management Mock', 'MBR-•••-1048'],
    ['Tham chiếu khoản bảo đảm', 'Đã ghi nhận', 'Financial Mock đã cung cấp tham chiếu bảo đảm phù hợp với điều kiện của phiên.', 'Financial Management Mock', 'FIN-•••-6830'],
    ['Tương thích quy tắc phiên', 'Đủ điều kiện tiếp tục', 'Các tham chiếu hiện tại phù hợp với phiên bản quy tắc đang áp dụng.', 'Auction Management', ruleVersion],
  ]
  const state = scenario === 'manual-review' ? ['Cần xem xét thêm', 'Chưa có quyết định cuối cùng. Bạn không cần gửi lại thông tin.'] : scenario === 'blocked-kyc' ? ['Chưa đáp ứng điều kiện', 'Tham chiếu KYC hiện chưa đáp ứng điều kiện của phiên đấu giá.'] : ['Chưa có tham chiếu', 'Financial Mock chưa cung cấp trạng thái khoản bảo đảm phù hợp.']
  return <>
    <p className="registration-eyebrow">BƯỚC 2 / 4</p><h2>Kiểm tra điều kiện tham gia</h2>
    <p className="registration-support">Các trạng thái dưới đây là tham chiếu mô phỏng và không thể chỉnh sửa tại Auction UI.</p>
    {override >= 0 && <aside className="registration-warning"><strong>{scenario === 'manual-review' ? 'Hồ sơ cần được xem xét thêm' : 'Chưa thể tiếp tục đăng ký'}</strong><p>{state[1]}</p></aside>}
    <div className="registration-eligibility-list">{items.map(([label, status, description, source, reference], index) => {
      const changed = index === override
      return <article className={`registration-eligibility-item ${changed ? 'needs-review' : ''}`} key={label}>
        <CheckCircle2/><div><div className="registration-item-heading"><h3>{label}</h3><span>{changed ? state[0] : status}</span></div><p>{changed ? state[1] : description}</p><small>Nguồn: {source} · Tham chiếu: {reference} · Snapshot: {snapshot} · Chỉ đọc</small></div>
      </article>
    })}</div>
  </>
}

function RegistrationRulesStep({ auction, declarations, onChange, onOpenRules }: { auction: Auction; declarations: boolean[]; onChange: (index: number) => void; onOpenRules: () => void }) {
  const labels = ['Tôi đã đọc phiên bản quy tắc hiện tại.', 'Tôi đồng ý tuân thủ quy tắc đấu giá của phiên này.', 'Tôi hiểu việc gửi đăng ký không đồng nghĩa điều kiện tham gia đã được phê duyệt.']
  return <>
    <p className="registration-eyebrow">BƯỚC 3 / 4</p><h2>Xác nhận quy tắc phiên</h2><p className="registration-support">Đọc bản snapshot chỉ đọc và xác nhận các nội dung trước khi kiểm tra lần cuối.</p>
    <section className="registration-rule-summary"><h3>Tóm tắt quy tắc</h3><dl className="registration-metadata-grid"><Metadata label="Phiên bản">{ruleVersion}</Metadata><Metadata label="Giá khởi điểm">{formatMoney(auction.startPrice)}</Metadata><Metadata label="Bước giá tối thiểu">{formatMoney(auction.minimumIncrement)}</Metadata><Metadata label="Bắt đầu">{startsAt}</Metadata><Metadata label="Kết thúc">{endsAt}</Metadata><Metadata label="Gia hạn">5 phút nếu có bid hợp lệ trong 5 phút cuối</Metadata></dl><p>Financial Mock chỉ xác nhận tham chiếu thanh toán; Auction UI không tự xác nhận người trúng đấu giá.</p></section>
    <button className="button secondary" onClick={onOpenRules}><FileText/>Xem toàn bộ quy tắc</button>
    {labels.map((label, index) => <label className="registration-ack" key={label}><input type="checkbox" checked={declarations[index]} onChange={() => onChange(index)} /> {label}</label>)}
  </>
}

function RegistrationReviewStep({ auction, final, onFinal, go }: { auction: Auction; final: boolean; onFinal: (value: boolean) => void; go: (index: number) => void }) {
  const sections = [['Phiên đấu giá', `${auction.assetName} · ${auction.code} · Trang sức · ${formatMoney(auction.startPrice)} · Hạn đăng ký: ${deadline}`, 0], ['Điều kiện tham gia', 'Thành viên, KYC, hạn chế, khoản bảo đảm và tương thích quy tắc đều là tham chiếu mock chỉ đọc.', 1], ['Quy tắc đã xác nhận', `${ruleVersion} · Ba tuyên bố đã được xác nhận · Snapshot chấp thuận: ${snapshot}`, 2]]
  return <>
    <p className="registration-eyebrow">BƯỚC 4 / 4</p><h2>Kiểm tra đăng ký trước khi gửi</h2><p className="registration-support">Xem lại phiên đấu giá, trạng thái điều kiện và các quy tắc bạn đã xác nhận.</p>
    {sections.map(([title, text, target]) => <section className="registration-review-section" key={title}><div><h3>{title}</h3><p>{text}</p></div><button type="button" onClick={() => go(Number(target))}>Chỉnh sửa</button></section>)}
    <label className="registration-ack"><input aria-describedby="final-reason" type="checkbox" checked={final} onChange={(event) => onFinal(event.target.checked)} /> Tôi xác nhận các thông tin trình bày ở trên là đúng với dữ liệu mô phỏng hiện tại.</label>
    {!final && <p id="final-reason" className="registration-validation">Vui lòng xác nhận thông tin trước khi gửi đăng ký.</p>}
  </>
}

function AuctionRegistrationContextCard({ auction }: { auction: Auction }) {
  return <aside className="registration-context"><img src={auction.image} alt={auction.assetName}/><span className="registration-status">ĐANG MỞ ĐĂNG KÝ</span><p className="registration-eyebrow">TRANG SỨC · {auction.code}</p><h2>{auction.assetName}</h2><dl><Metadata label="Giá khởi điểm">{formatMoney(auction.startPrice)}</Metadata><Metadata label="Hạn đăng ký">{deadline}</Metadata><Metadata label="Bắt đầu">{startsAt}</Metadata><Metadata label="Quy tắc">{ruleVersion}</Metadata></dl><ul><li>Tài sản đã được thẩm định mock.</li><li>Quy tắc phiên đã khóa.</li><li>External references chỉ đọc.</li></ul><Link to={`/auctions/${auction.id}`}>Xem chi tiết phiên</Link></aside>
}

export function AuctionRegistrationWizard() {
  const { auctionId } = useParams(); const [params, setParams] = useSearchParams()
  const [summary, setSummary] = useState(false), [rules, setRules] = useState([false, false, false]), [final, setFinal] = useState(false), [drawer, setDrawer] = useState(false), [modal, setModal] = useState(false), [sending, setSending] = useState(false), [done, setDone] = useState(false)
  const submit = useRef<HTMLButtonElement>(null), close = useRef<HTMLButtonElement>(null)
  const auction = catalogAuctions.find((item) => item.id === auctionId)
  const active = Math.max(0, steps.findIndex(([id]) => id === (params.get('step') || 'summary')))
  const scenario = (params.get('scenario') || 'eligible') as Scenario
  const go = (index: number) => setParams({ step: steps[index][0], ...(scenario !== 'eligible' ? { scenario } : {}) })
  const blocked = active === 1 && scenario !== 'eligible'
  useEffect(() => { if (!drawer && !modal) return; const original = document.body.style.overflow; document.body.style.overflow = 'hidden'; close.current?.focus(); const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !sending) { setDrawer(false); setModal(false) } }; window.addEventListener('keydown', onKeyDown); return () => { document.body.style.overflow = original; window.removeEventListener('keydown', onKeyDown) } }, [drawer, modal, sending])
  if (!auction) return <div className="auction-registration-page registration-state"><h1>Không tìm thấy phiên đấu giá</h1><Link className="button primary" to="/auctions">Quay lại danh sách phiên</Link></div>
  if (done) return <div className="auction-registration-page registration-state"><ShieldCheck/><h1>Đăng ký đã được gửi</h1><p>Hệ thống mô phỏng đang kiểm tra điều kiện tham gia. Việc gửi đăng ký chưa đồng nghĩa hồ sơ đã được phê duyệt.</p><Link className="button primary" to={`/auctions/${auction.id}/eligibility`}>Xem trạng thái điều kiện</Link></div>
  const closeOverlay = () => { setDrawer(false); setModal(false) }
  return <div className="auction-registration-page"><section className="registration-hero"><div className="container"><span>ĐĂNG KÝ THAM GIA</span><h1>Hoàn tất đăng ký phiên đấu giá</h1><p>{auction.assetName}</p></div></section><main className="container registration-wrap"><nav className="registration-stepper" aria-label="Các bước đăng ký">{steps.map(([id, label], index) => <button key={id} className={index === active ? 'active' : ''} aria-current={index === active ? 'step' : undefined} onClick={() => index <= active && go(index)}><b>{index + 1}</b>{label}</button>)}</nav><div className="registration-grid"><section className="registration-card">{active === 0 && <RegistrationSummaryStep auction={auction} acknowledged={summary} onAcknowledge={setSummary}/>} {active === 1 && <RegistrationEligibilityStep scenario={scenario}/>} {active === 2 && <RegistrationRulesStep auction={auction} declarations={rules} onChange={(index: number) => setRules((items) => items.map((item, current) => current === index ? !item : item))} onOpenRules={() => setDrawer(true)}/>} {active === 3 && <RegistrationReviewStep auction={auction} final={final} onFinal={setFinal} go={go}/>}<div className="registration-actions">{active > 0 && <button className="button secondary" onClick={() => go(active - 1)}><ChevronLeft/>Quay lại</button>}{active < 3 ? <button className="button primary" disabled={(active === 0 && !summary) || (active === 1 && blocked) || (active === 2 && !rules.every(Boolean))} onClick={() => go(active + 1)}>Tiếp tục</button> : <button ref={submit} className="button primary" disabled={!final} onClick={() => setModal(true)}>Gửi đăng ký</button>}</div></section><AuctionRegistrationContextCard auction={auction}/></div></main>{drawer && <Overlay title="Quy tắc đấu giá" close={closeOverlay} closeRef={close}><p>{ruleVersion} áp dụng cho phiên {auction.code} và được sử dụng dưới dạng snapshot chỉ đọc.</p>{[['Giá khởi điểm', formatMoney(auction.startPrice)], ['Bước giá tối thiểu', formatMoney(auction.minimumIncrement)], ['Thời gian', `${startsAt} đến ${endsAt}`], ['Chính sách gia hạn', 'Có bid hợp lệ trong 5 phút cuối sẽ gia hạn 5 phút theo mock rule.'], ['Điều kiện đặt giá hợp lệ', 'Eligibility đang phù hợp, giá đặt không thấp hơn minimum next bid và phiên không paused, closing hoặc closed.'], ['Quy tắc chốt phiên', 'Rank 1 sau khi đóng phiên chỉ là ứng viên ưu tiên, chưa phải người trúng đấu giá chính thức.'], ['Candidate và Financial Mock', 'Financial Mock xác nhận trạng thái thanh toán; Auction UI không tự xác nhận payment hoặc Final Winner.'], ['Hủy phiên và ngoại lệ', 'Phiên có thể cancelled, paused hoặc emergency close theo trạng thái vận hành mock.']].map(([title, text]) => <article key={title}><h3>{title}</h3><p>{text}</p></article>)}</Overlay>}{modal && <Overlay title="Gửi đăng ký tham gia phiên đấu giá?" close={closeOverlay} closeRef={close} modal><p>{auction.assetName} · {auction.code}</p><p>Giá khởi điểm: {formatMoney(auction.startPrice)} · {ruleVersion}</p><p>Sau khi gửi, hồ sơ sẽ chuyển sang trạng thái đang kiểm tra điều kiện. Việc gửi đăng ký không đồng nghĩa điều kiện tham gia đã được phê duyệt.</p><div className="registration-actions"><button className="button secondary" disabled={sending} onClick={closeOverlay}>Kiểm tra lại</button><button className="button primary" disabled={sending} onClick={() => { setSending(true); window.setTimeout(() => { setModal(false); setDone(true) }, 700) }}>{sending ? 'Đang gửi đăng ký...' : 'Xác nhận gửi đăng ký'}</button></div></Overlay>}</div>
}

function Overlay({ title, close, closeRef, children, modal = false }: { title: string; close: () => void; closeRef: RefObject<HTMLButtonElement | null>; children: ReactNode; modal?: boolean }) {
  return <div className="registration-overlay" onMouseDown={close}><section className={`registration-${modal ? 'modal' : 'drawer'}`} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}><button ref={closeRef} className="registration-close" aria-label="Đóng" onClick={close}><X/></button><h2>{title}</h2>{children}</section></div>
}
