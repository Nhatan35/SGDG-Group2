import { useState } from "react";
const faqs = [
  [
    "Tôi cần gì để tham gia?",
    "Tài khoản đã xác minh KYC, hồ sơ theo yêu cầu phiên, chấp thuận quy chế và tiền đặt trước hợp lệ.",
  ],
  [
    "Manual Bid hoạt động thế nào?",
    "Bạn nhập mức giá hợp lệ theo bước giá, xác nhận rồi chờ hệ thống trả trạng thái accepted hoặc rejected.",
  ],
  [
    "Auto Bid có lộ mức tối đa không?",
    "Không. Mức tối đa chỉ chủ tài khoản được xem và không xuất hiện trên leaderboard.",
  ],
  [
    "Khi mất kết nối thì sao?",
    "Bid controls sẽ tạm khóa trong lúc reconnect và chỉ mở lại sau khi resync hoàn tất.",
  ],
  [
    "Người trúng đấu giá thanh toán thế nào?",
    "Hệ thống tạo nghĩa vụ thanh toán riêng với số tiền, khoản khấu trừ, thời hạn và trạng thái đối soát.",
  ],
];
export function HelpPage() {
  const [open, setOpen] = useState(0);
  return (
    <div className="container page-shell narrow">
      <div className="page-heading">
        <span className="eyebrow">TRUNG TÂM HỖ TRỢ</span>
        <h1>Quy trình đấu giá từ đầu đến cuối</h1>
        <p>Câu trả lời rõ ràng cho các bước quan trọng.</p>
      </div>
      <div className="flow-steps">
        {[
          "Xác minh",
          "Đăng ký",
          "Tham gia",
          "Kết quả",
          "Thanh toán",
          "Bàn giao",
        ].map((x, i) => (
          <div key={x}>
            <span>{i + 1}</span>
            <strong>{x}</strong>
          </div>
        ))}
      </div>
      <section className="faq-list">
        <h2>Câu hỏi thường gặp</h2>
        {faqs.map(([q, a], i) => (
          <article key={q}>
            <button
              aria-expanded={open === i}
              onClick={() => setOpen(open === i ? -1 : i)}
            >
              {q}
              <span>{open === i ? "−" : "+"}</span>
            </button>
            {open === i && <p>{a}</p>}
          </article>
        ))}
      </section>
    </div>
  );
}
