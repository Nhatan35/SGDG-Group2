import { Link } from "react-router-dom";

export function HandoverChildPageHeader({ caseId, title, assetName, caseReference }: { caseId: string; title: string; assetName: string; caseReference: string }) {
  return <header className="handover-child-header"><nav aria-label="Điều hướng breadcrumb"><Link to={`/me/handover/${caseId}`}>Hồ sơ bàn giao</Link><span aria-hidden="true">/</span><span>{title}</span></nav><h1>{title}</h1><p>{assetName} · {caseReference}</p><Link className="handover-back-link" to={`/me/handover/${caseId}`}>Quay lại hồ sơ bàn giao</Link></header>;
}
