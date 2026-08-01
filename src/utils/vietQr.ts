type VietQrPayloadInput = {
  bankBin: string;
  accountNumber: string;
  amount: number;
  additionalInfo: string;
};

const emvField = (id: string, value: string) =>
  `${id}${value.length.toString().padStart(2, "0")}${value}`;

const crc16Ccitt = (value: string) => {
  let crc = 0xffff;
  for (let index = 0; index < value.length; index += 1) {
    crc ^= value.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit += 1)
      crc = (crc & 0x8000) !== 0 ? (crc << 1) ^ 0x1021 : crc << 1;
    crc &= 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
};

export const normalizeVietQrText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50);

export function buildVietQrPayload({
  bankBin,
  accountNumber,
  amount,
  additionalInfo,
}: VietQrPayloadInput) {
  const normalizedBin = bankBin.replace(/\D/g, "");
  const normalizedAccount = accountNumber.replace(/\s/g, "");
  const normalizedAmount = Math.round(amount).toString();
  const normalizedInfo = normalizeVietQrText(additionalInfo);

  if (!/^\d{6}$/.test(normalizedBin))
    throw new Error("VietQR bank BIN must contain exactly six digits.");
  if (!/^[A-Za-z0-9]{6,19}$/.test(normalizedAccount))
    throw new Error("VietQR account number is invalid.");
  if (!/^\d{1,13}$/.test(normalizedAmount) || Number(normalizedAmount) <= 0)
    throw new Error("VietQR amount is invalid.");
  if (!normalizedInfo)
    throw new Error("VietQR transfer description is required.");

  const consumerAccount = [
    emvField("00", normalizedBin),
    emvField("01", normalizedAccount),
  ].join("");
  const merchantAccount = [
    emvField("00", "A000000727"),
    emvField("01", consumerAccount),
    emvField("02", "QRIBFTTA"),
  ].join("");
  const payloadWithoutChecksum = [
    emvField("00", "01"),
    emvField("01", "12"),
    emvField("38", merchantAccount),
    emvField("53", "704"),
    emvField("54", normalizedAmount),
    emvField("58", "VN"),
    emvField("62", emvField("08", normalizedInfo)),
    "6304",
  ].join("");

  return `${payloadWithoutChecksum}${crc16Ccitt(payloadWithoutChecksum)}`;
}
