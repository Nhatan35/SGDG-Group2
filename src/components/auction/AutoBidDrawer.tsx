import { ShieldCheck } from "lucide-react";
import { useRef, useState } from "react";
import type { AutoBidStatus, AuctionStatus } from "../../types/domain";
import { formatDateTime, formatMoney } from "../../utils/format";
import { Button } from "../common/Button";
import { Dialog } from "../common/Dialog";
import { Drawer } from "../common/Drawer";
import "../../styles/auto-bid-drawer.css";

export interface AutoBidInstruction {
  status: AutoBidStatus;
  maximumAmount: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface AutoBidDrawerProps {
  currentPrice: number;
  minimumNextBid: number;
  minimumIncrement: number;
  auctionStatus: AuctionStatus;
  autoBidSupported: boolean;
  instruction: AutoBidInstruction;
  onSave: (maximumAmount: number) => void;
  onDisable: () => void;
  onClose: () => void;
}

const AUTO_BID_DEMO_CAP = 10_000_000_000;
const formatCompactMoney = (value: number) =>
  value >= 1_000_000_000
    ? `${value / 1_000_000_000} tỷ`
    : `${value / 1_000_000} triệu`;

export function AutoBidDrawer({
  currentPrice,
  minimumNextBid,
  minimumIncrement,
  auctionStatus,
  autoBidSupported,
  instruction,
  onSave,
  onDisable,
  onClose,
}: AutoBidDrawerProps) {
  const [value, setValue] = useState(
    instruction.maximumAmount ? String(instruction.maximumAmount) : "",
  );
  const [error, setError] = useState("");
  const [view, setView] = useState<"form" | "disabled">("form");
  const [confirmDisable, setConfirmDisable] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isManaging =
    instruction.status === "ACTIVE" ||
    instruction.status === "LIMIT_REACHED" ||
    instruction.status === "PAUSED";
  const isLimitReached = instruction.status === "LIMIT_REACHED";
  const title = isManaging ? "Quản lý Auto-bid" : "Thiết lập Auto-bid";
  const canCommit = auctionStatus === "LIVE" && autoBidSupported;
  const amount = Number(value);
  const isValidAmount =
    Boolean(value) &&
    Number.isFinite(amount) &&
    amount >= minimumNextBid &&
    (amount - currentPrice) % minimumIncrement === 0 &&
    amount <= AUTO_BID_DEMO_CAP;
  const suggestions = [1, 2, 4, 10].map((multiplier) => ({
    multiplier,
    value: currentPrice + minimumIncrement * multiplier,
  }));
  const previewAmount = isValidAmount ? amount : instruction.maximumAmount;

  const validate = () => {
    if (!value) return "Vui lòng nhập mức Auto-bid tối đa.";
    if (!Number.isFinite(amount) || amount < minimumNextBid)
      return `Mức Auto-bid tối thiểu là ${formatMoney(minimumNextBid)}.`;
    if ((amount - currentPrice) % minimumIncrement !== 0)
      return `Mức Auto-bid phải tăng theo bước giá ${formatMoney(minimumIncrement)}.`;
    if (amount > AUTO_BID_DEMO_CAP)
      return "Mức giá vượt giới hạn mô phỏng của phiên này.";
    if (!autoBidSupported) return "Phiên này không hỗ trợ Auto-bid.";
    if (auctionStatus === "PAUSED")
      return "Phiên đang tạm dừng. Bạn chưa thể bật hoặc cập nhật Auto-bid.";
    if (auctionStatus !== "LIVE")
      return "Phiên đã kết thúc. Không thể tạo chỉ thị Auto-bid mới.";
    return "";
  };

  const save = () => {
    const message = validate();
    if (message) return setError(message);
    onSave(amount);
    setError("");
  };
  const disable = () => {
    onDisable();
    setConfirmDisable(false);
    setView("disabled");
  };
  const primaryLabel =
    instruction.status === "OFF"
      ? "Bật Auto-bid"
      : isLimitReached
        ? "Cập nhật giới hạn"
        : "Cập nhật Auto-bid";

  const footer =
    view === "disabled" ? (
      <Button onClick={onClose}>Đóng</Button>
    ) : (
      <>
        <Button variant="secondary" onClick={onClose}>
          Đóng
        </Button>
        {isManaging && (
          <Button variant="danger" onClick={() => setConfirmDisable(true)}>
            Tắt Auto-bid
          </Button>
        )}
        <Button disabled={!canCommit} onClick={save}>
          {primaryLabel}
        </Button>
      </>
    );

  return (
    <>
      <Drawer
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        title={view === "disabled" ? "Auto-bid đã được tắt" : title}
        description="AUTO-BID"
        initialFocusRef={view === "form" ? inputRef : undefined}
        preventClose={confirmDisable}
        mobilePresentation="bottom-sheet"
        panelClassName="auto-bid-drawer"
        closeLabel="Đóng Auto-bid"
        footer={footer}
      >
        {view === "disabled" ? (
          <section className="auto-bid-body auto-bid-success">
            <ShieldCheck aria-hidden="true" />
            <h3>Auto-bid đã được tắt</h3>
            <p>Giá và các bid đã được chấp nhận vẫn được giữ nguyên.</p>
          </section>
        ) : (
          <section className="auto-bid-body">
            <p className="auto-bid-intro">
              Đặt mức giá tối đa bạn sẵn sàng trả.
              <br />
              Mức này chỉ hiển thị với bạn.
            </p>
            <div className="auto-bid-price-context">
              <div className="auto-bid-current-price">
                <span>Giá chính thức hiện tại</span>
                <strong>{formatMoney(currentPrice)}</strong>
              </div>
              <div className="auto-bid-price-details">
                <span>
                  Mức tối thiểu tiếp theo
                  <strong>{formatMoney(minimumNextBid)}</strong>
                </span>
                <span>
                  Bước giá tối thiểu
                  <strong>{formatMoney(minimumIncrement)}</strong>
                </span>
              </div>
            </div>
            {isManaging && (
              <section
                className={`auto-bid-manage-summary ${isLimitReached ? "limit" : ""}`}
              >
                <strong>
                  {isLimitReached
                    ? "Auto-bid đã đạt giới hạn"
                    : "Auto-bid đang hoạt động"}
                </strong>
                <p>
                  {isLimitReached
                    ? "Mức tối đa hiện tại không đủ để tạo lượt đấu tiếp theo."
                    : "Mức tối đa của bạn chỉ là giới hạn riêng tư, không phải giá đấu chính thức."}
                </p>
                <dl>
                  <div>
                    <dt>Mức tối đa của bạn</dt>
                    <dd>{formatMoney(instruction.maximumAmount ?? 0)}</dd>
                  </div>
                  <div>
                    <dt>Giới hạn còn lại</dt>
                    <dd>
                      {formatMoney(
                        Math.max(
                          (instruction.maximumAmount ?? 0) - currentPrice,
                          0,
                        ),
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Tương đương</dt>
                    <dd>
                      {Math.max(
                        Math.floor(
                          ((instruction.maximumAmount ?? currentPrice) -
                            currentPrice) /
                            minimumIncrement,
                        ),
                        0,
                      )}{" "}
                      bước giá
                    </dd>
                  </div>
                  {instruction.updatedAt && (
                    <div>
                      <dt>Cập nhật lần cuối</dt>
                      <dd>{formatDateTime(instruction.updatedAt)}</dd>
                    </div>
                  )}
                </dl>
              </section>
            )}
            <label className="auto-bid-money-field">
              Mức Auto-bid tối đa
              <input
                ref={inputRef}
                inputMode="numeric"
                value={value}
                onChange={(event) => {
                  setValue(event.target.value.replace(/\D/g, ""));
                  setError("");
                }}
                aria-describedby="auto-bid-helper auto-bid-error"
                disabled={!canCommit}
                placeholder="Nhập mức giá tối đa"
              />
            </label>
            <small id="auto-bid-helper">
              Tối thiểu {formatMoney(minimumNextBid)} · Bước giá{" "}
              {formatMoney(minimumIncrement)}
            </small>
            <div className="auto-bid-suggestions">
              {suggestions.map(({ multiplier, value: suggestion }) => (
                <button
                  type="button"
                  key={suggestion}
                  onClick={() => {
                    setValue(String(suggestion));
                    setError("");
                  }}
                  disabled={!canCommit}
                >
                  +{formatCompactMoney(minimumIncrement * multiplier)}
                </button>
              ))}
            </div>
            {isValidAmount && (
              <section className="auto-bid-preview">
                <strong>Thiết lập của bạn</strong>
                <span>
                  Mức tối đa <b>{formatMoney(amount)}</b>
                </span>
                <span>
                  Cao hơn giá hiện tại{" "}
                  <b>{formatMoney(amount - currentPrice)}</b>
                </span>
                <span>
                  Tương đương tối đa{" "}
                  <b>{(amount - currentPrice) / minimumIncrement} bước giá</b>
                </span>
              </section>
            )}
            {error && (
              <p className="auto-bid-error" id="auto-bid-error">
                {error}
              </p>
            )}
            {!canCommit && (
              <p className="auto-bid-error">
                {autoBidSupported
                  ? "Phiên hiện không cho phép cập nhật Auto-bid."
                  : "Phiên này không hỗ trợ Auto-bid."}
              </p>
            )}
            <aside className="auto-bid-privacy">
              <ShieldCheck aria-hidden="true" />
              <div>
                <strong>Mức tối đa được bảo mật</strong>
                <p>
                  Người tham gia khác chỉ nhìn thấy giá đấu chính thức đã được
                  chấp nhận. Họ không thể nhìn thấy mức tối đa Auto-bid của bạn.
                </p>
              </div>
            </aside>
            <section className="auto-bid-explanation">
              <h3>Auto-bid hoạt động như thế nào?</h3>
              <dl>
                <div>
                  <dt>Giá hiện tại</dt>
                  <dd>{formatMoney(currentPrice)}</dd>
                </div>
                <div>
                  <dt>Nếu người khác đặt</dt>
                  <dd>{formatMoney(minimumNextBid)}</dd>
                </div>
                <div>
                  <dt>Auto-bid có thể đặt</dt>
                  <dd>
                    {formatMoney(
                      Math.min(
                        minimumNextBid + minimumIncrement,
                        previewAmount ?? minimumNextBid + minimumIncrement,
                      ),
                    )}
                  </dd>
                </div>
              </dl>
              <p>
                Hệ thống tăng theo bước giá nhưng không vượt quá mức tối đa bạn
                đã thiết lập.
              </p>
            </section>
          </section>
        )}
      </Drawer>
      <Dialog
        open={confirmDisable}
        onOpenChange={setConfirmDisable}
        title="Tắt Auto-bid?"
        description="Hệ thống sẽ ngừng tạo các bid mới thay bạn."
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setConfirmDisable(false)}
            >
              Quay lại
            </Button>
            <Button variant="danger" onClick={disable}>
              Xác nhận tắt Auto-bid
            </Button>
          </>
        }
      >
        <p className="auto-bid-disable">
          Các bid đã được chấp nhận trước đó vẫn được giữ nguyên.
        </p>
      </Dialog>
    </>
  );
}
