import {
  CheckCircle2,
  Clock3,
  MapPin,
  PackageCheck,
  Pencil,
  ShieldCheck,
  Truck,
  X,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getHandoverCaseFixture } from "../../services/mock/handoverService";
import { auctions } from "../../services/mock/auctionService";
import {
  DEFAULT_HANDOVER_DELIVERY_ADDRESS,
  formatHandoverDeliveryAddress,
  type HandoverDeliveryAddress,
  useHandoverDeliveryAddressStore,
} from "../../store/handoverDeliveryAddressStore";
import { formatDateTime, formatMoney } from "../../utils/format";
import { NotFoundPage } from "../NotFoundPage";
import "../../styles/handover-overview.css";

const handoverSteps = [
  ["Đã thanh toán", "16/05/2024"],
  ["Xác nhận về người bán", "16/05/2024"],
  ["Đang chuẩn bị bàn giao", "17/05/2024"],
  ["Đang vận chuyển", "18/05/2024"],
  ["Hoàn tất bàn giao", "Dự kiến 19/05/2024"],
] as const;

export function HandoverOverviewPage() {
  const { caseId } = useParams();
  const [params] = useSearchParams();
  const storedAddress = useHandoverDeliveryAddressStore((state) =>
    caseId ? state.addresses[caseId] : undefined,
  );
  const updateAddress = useHandoverDeliveryAddressStore(
    (state) => state.updateAddress,
  );
  const deliveryAddress =
    storedAddress ?? DEFAULT_HANDOVER_DELIVERY_ADDRESS;
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressDraft, setAddressDraft] = useState<HandoverDeliveryAddress>(
    DEFAULT_HANDOVER_DELIVERY_ADDRESS,
  );
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>(
    {},
  );
  const [addressMessage, setAddressMessage] = useState("");
  const fixture = caseId ? getHandoverCaseFixture(caseId, "in-transit") : undefined;
  const requestedAuctionId = params.get("auctionId");
  const auction =
    auctions.find((item) => item.id === requestedAuctionId) ||
    auctions.find((item) => item.id === fixture?.auctionId);

  if (!fixture || !auction) return <NotFoundPage />;

  const winningPrice = auction.currentPrice || auction.startPrice;
  const paidAt = "2026-07-20T07:25:00.000Z";
  const canEditDeliveryAddress = fixture.status !== "COMPLETED";

  function openAddressEditor() {
    setAddressDraft({ ...deliveryAddress });
    setAddressErrors({});
    setAddressMessage("");
    setEditingAddress(true);
  }

  function updateAddressDraft(
    field: keyof HandoverDeliveryAddress,
    value: string,
  ) {
    setAddressDraft((current) => ({ ...current, [field]: value }));
    setAddressErrors((current) => ({ ...current, [field]: "" }));
  }

  function saveDeliveryAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!caseId) return;
    const phone = addressDraft.phone.replace(/\D/g, "");
    const nextAddress = {
      ...addressDraft,
      recipientName: addressDraft.recipientName.trim(),
      phone,
      addressLine: addressDraft.addressLine.trim(),
      ward: addressDraft.ward.trim(),
      district: addressDraft.district.trim(),
      city: addressDraft.city.trim(),
      note: addressDraft.note.trim(),
    };
    const errors: Record<string, string> = {};
    if (nextAddress.recipientName.length < 2)
      errors.recipientName = "Vui lòng nhập tên người nhận.";
    if (!/^0\d{9}$/.test(phone))
      errors.phone = "Số điện thoại cần gồm 10 chữ số và bắt đầu bằng 0.";
    if (nextAddress.addressLine.length < 5)
      errors.addressLine = "Vui lòng nhập địa chỉ cụ thể.";
    if (!nextAddress.district)
      errors.district = "Vui lòng nhập quận hoặc huyện.";
    if (!nextAddress.city)
      errors.city = "Vui lòng nhập tỉnh hoặc thành phố.";

    if (Object.keys(errors).length) {
      setAddressErrors(errors);
      document.getElementById(`delivery-${Object.keys(errors)[0]}`)?.focus();
      return;
    }

    updateAddress(caseId, nextAddress);
    setEditingAddress(false);
    setAddressMessage(
      "Đã cập nhật địa chỉ nhận hàng và gửi thông tin mới tới SGDG Logistics.",
    );
  }

  return (
    <main className="container handover-overview-page post-auction-page">
      <header className="post-auction-heading">
        <span>THEO DÕI BÀN GIAO</span>
        <h1>Theo dõi bàn giao tài sản</h1>
        <p>
          Cập nhật trạng thái thanh toán, chuẩn bị hàng, vận chuyển và hoàn tất
          giao dịch cho tài sản bạn đã thắng đấu giá.
        </p>
      </header>

      <section className="handover-tracker-card">
        <ol className="handover-tracker">
          {handoverSteps.map(([title, date], index) => (
            <li key={title} className={index < 4 ? "done" : "pending"}>
              <span>{index < 4 ? <CheckCircle2 aria-hidden="true" /> : index + 1}</span>
              <strong>{title}</strong>
              <small>{date}</small>
            </li>
          ))}
        </ol>
      </section>

      <div className="handover-summary-layout">
        <section className="handover-transaction-card">
          <h2>Thông tin giao dịch</h2>
          <div className="handover-transaction-asset">
            <img src={auction.image} alt={auction.assetName} />
            <div>
              <h3>{auction.assetName}</h3>
              <p>{auction.code}</p>
              <span>
                <ShieldCheck aria-hidden="true" />
                Người bán uy tín
              </span>
            </div>
          </div>
          <dl>
            <div>
              <dt>Giá trúng</dt>
              <dd>{formatMoney(winningPrice)}</dd>
            </div>
            <div>
              <dt>Ngày thanh toán</dt>
              <dd>{formatDateTime(paidAt)}</dd>
            </div>
          </dl>
        </section>

        <section className="handover-delivery-summary">
          <h2>Thông tin giao hàng</h2>
          <dl>
            <div>
              <dt>Đơn vị vận chuyển</dt>
              <dd>SGDG Logistics</dd>
            </div>
            <div>
              <dt>Mã vận đơn</dt>
              <dd>SGDG-20240517-001</dd>
            </div>
            <div>
              <dt>Dự kiến giao hàng</dt>
              <dd>19/05/2024</dd>
            </div>
            <div className="handover-address-row">
              <dt>Địa chỉ nhận hàng</dt>
              <dd className="handover-address-value">
                <span className="handover-address-pin" aria-hidden="true">
                  <MapPin />
                </span>
                <span>{formatHandoverDeliveryAddress(deliveryAddress)}</span>
                {canEditDeliveryAddress && (
                  <button type="button" onClick={openAddressEditor}>
                    <Pencil aria-hidden="true" /> Chỉnh sửa
                  </button>
                )}
              </dd>
            </div>
          </dl>
          {addressMessage && (
            <p className="handover-address-success" role="status">
              <CheckCircle2 aria-hidden="true" /> {addressMessage}
            </p>
          )}
        </section>
      </div>

      <section className="handover-live-status">
        <Truck aria-hidden="true" />
        <div>
          <h2>Đang vận chuyển</h2>
          <p>
            Tài sản đã được niêm phong và bàn giao cho SGDG Logistics. Bạn sẽ
            nhận thông báo khi tài sản đến điểm nhận.
          </p>
        </div>
        <Link
          className="button primary"
          to={`/me/handover/${fixture.caseId}/completion?scenario=completed&auctionId=${auction.id}`}
        >
          Hoàn tất giao dịch demo
        </Link>
      </section>

      <section className="handover-support-grid">
        <article>
          <PackageCheck aria-hidden="true" />
          <h2>Hồ sơ bàn giao</h2>
          <p>Mã hồ sơ {fixture.caseReference} đã được kích hoạt.</p>
        </article>
        <article>
          <MapPin aria-hidden="true" />
          <h2>Điểm nhận</h2>
          <p>Địa chỉ được xác nhận theo thông tin người thắng đấu giá.</p>
        </article>
        <article>
          <Clock3 aria-hidden="true" />
          <h2>Cập nhật liên tục</h2>
          <p>Thông báo sẽ được gửi khi có mốc bàn giao mới.</p>
        </article>
      </section>

      {editingAddress && (
        <div
          className="handover-address-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delivery-address-title"
        >
          <section className="handover-address-modal">
            <header>
              <div>
                <span>THÔNG TIN NHẬN HÀNG</span>
                <h2 id="delivery-address-title">Chỉnh sửa địa chỉ nhận hàng</h2>
                <p>Thông tin mới sẽ được gửi tới đơn vị vận chuyển.</p>
              </div>
              <button
                type="button"
                aria-label="Đóng cửa sổ chỉnh sửa địa chỉ"
                onClick={() => setEditingAddress(false)}
              >
                <X aria-hidden="true" />
              </button>
            </header>

            <div className="handover-address-warning">
              <Truck aria-hidden="true" />
              <p>
                Đơn hàng đang vận chuyển. Việc đổi địa chỉ có thể làm thay đổi
                thời gian giao dự kiến.
              </p>
            </div>

            <form onSubmit={saveDeliveryAddress} noValidate>
              <div className="handover-address-form-grid">
                <label>
                  Họ và tên người nhận
                  <input
                    id="delivery-recipientName"
                    value={addressDraft.recipientName}
                    onChange={(event) =>
                      updateAddressDraft("recipientName", event.target.value)
                    }
                    aria-invalid={Boolean(addressErrors.recipientName)}
                  />
                  {addressErrors.recipientName && (
                    <small>{addressErrors.recipientName}</small>
                  )}
                </label>
                <label>
                  Số điện thoại
                  <input
                    id="delivery-phone"
                    inputMode="tel"
                    value={addressDraft.phone}
                    onChange={(event) =>
                      updateAddressDraft("phone", event.target.value)
                    }
                    aria-invalid={Boolean(addressErrors.phone)}
                  />
                  {addressErrors.phone && <small>{addressErrors.phone}</small>}
                </label>
                <label className="wide">
                  Địa chỉ cụ thể
                  <input
                    id="delivery-addressLine"
                    value={addressDraft.addressLine}
                    placeholder="Số nhà, tên đường"
                    onChange={(event) =>
                      updateAddressDraft("addressLine", event.target.value)
                    }
                    aria-invalid={Boolean(addressErrors.addressLine)}
                  />
                  {addressErrors.addressLine && (
                    <small>{addressErrors.addressLine}</small>
                  )}
                </label>
                <label>
                  Phường / Xã
                  <input
                    id="delivery-ward"
                    value={addressDraft.ward}
                    onChange={(event) =>
                      updateAddressDraft("ward", event.target.value)
                    }
                  />
                </label>
                <label>
                  Quận / Huyện
                  <input
                    id="delivery-district"
                    value={addressDraft.district}
                    onChange={(event) =>
                      updateAddressDraft("district", event.target.value)
                    }
                    aria-invalid={Boolean(addressErrors.district)}
                  />
                  {addressErrors.district && (
                    <small>{addressErrors.district}</small>
                  )}
                </label>
                <label>
                  Tỉnh / Thành phố
                  <input
                    id="delivery-city"
                    value={addressDraft.city}
                    onChange={(event) =>
                      updateAddressDraft("city", event.target.value)
                    }
                    aria-invalid={Boolean(addressErrors.city)}
                  />
                  {addressErrors.city && <small>{addressErrors.city}</small>}
                </label>
                <label>
                  Ghi chú giao hàng
                  <input
                    id="delivery-note"
                    value={addressDraft.note}
                    placeholder="Ví dụ: Gọi trước khi giao"
                    onChange={(event) =>
                      updateAddressDraft("note", event.target.value)
                    }
                  />
                </label>
              </div>

              <div className="handover-address-actions">
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => setEditingAddress(false)}
                >
                  Hủy
                </button>
                <button className="button primary">
                  <CheckCircle2 aria-hidden="true" /> Lưu địa chỉ
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
