import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@xsec/ui-react';
import { compactParameterLabel, extensionLabel, formatBytes, formatTime, hostLabel, methodClass, mimeLabel, parameterLabel, requestTarget, sourceLabel, statusClass } from "../format";
import type { TrafficSummary } from "../types";

/** Render the flow table component. */
export function FlowTable({ rows, page, selectedId, onSelect, onOpen }: {
  rows: TrafficSummary[];
  page: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpen: (row: TrafficSummary) => void;
}) {
  return <Table className="traffic-table"><TableHead><TableRow>
    <TableHeader className="col-index">#</TableHeader><TableHeader className="col-method">方法</TableHeader><TableHeader className="col-request-compact">请求</TableHeader><TableHeader className="col-host">主机</TableHeader><TableHeader className="col-path">URL</TableHeader><TableHeader className="col-parameters">参数</TableHeader><TableHeader className="col-status">状态码</TableHeader><TableHeader className="col-type-compact">类型</TableHeader><TableHeader className="col-mime">响应类型</TableHeader><TableHeader className="col-extension">扩展名</TableHeader><TableHeader className="col-source">来源</TableHeader><TableHeader className="col-scope">范围</TableHeader><TableHeader className="col-duration">耗时</TableHeader><TableHeader className="col-size">大小</TableHeader><TableHeader className="col-time">时间</TableHeader>
  </TableRow></TableHead><TableBody>{rows.map((row, index) => {
    const target = requestTarget(row);
    const hostName = hostLabel(row);
    return <TableRow key={row.flow_id} tabIndex={0} aria-selected={selectedId === row.flow_id} data-selected={selectedId === row.flow_id} className={selectedId === row.flow_id ? "is-selected" : ""} onClick={() => onSelect(row.flow_id)} onDoubleClick={() => onOpen(row)} onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(row.flow_id); }
    }}>
      <TableCell className="col-index">{(page - 1) * 100 + index + 1}</TableCell><TableCell className="col-method"><span className={`traffic-method ${methodClass(row.method)}`}>{row.method}</span></TableCell>
      <TableCell className="col-request-compact"><div className="compact-primary"><span className={`traffic-method ${methodClass(row.method)}`}>{row.method}</span><strong title={hostName}>{hostName}</strong></div><span className="compact-secondary" title={target}>{target}</span><div className="compact-meta"><span>{compactParameterLabel(row.has_parameters)}</span><span>{row.in_scope ? "范围内" : "范围外"}</span></div></TableCell>
      <TableCell className="col-host" title={hostName}>{hostName}</TableCell><TableCell className="col-path" title={target}>{target}</TableCell><TableCell className="col-parameters">{parameterLabel(row.has_parameters)}</TableCell><TableCell className="col-status"><span className={`traffic-status ${statusClass(row.status)}`}>{row.status ?? "无响应"}</span></TableCell>
      <TableCell className="col-type-compact"><div className="compact-primary"><span>{mimeLabel(row.mime_category)}</span><span>{extensionLabel(row.file_extension)}</span></div><span className="compact-meta">来源：{sourceLabel(row.capture_source)}</span></TableCell>
      <TableCell className="col-mime">{mimeLabel(row.mime_category)}</TableCell><TableCell className="col-extension">{extensionLabel(row.file_extension)}</TableCell><TableCell className="col-source">{sourceLabel(row.capture_source)}</TableCell><TableCell className="col-scope">{row.in_scope ? "范围内" : "范围外"}</TableCell><TableCell className="col-duration">{row.duration_ms == null ? "—" : `${row.duration_ms} ms`}</TableCell><TableCell className="col-size">{formatBytes(row.response_body_size)}</TableCell><TableCell className="col-time">{formatTime(row.timestamp)}</TableCell>
    </TableRow>;
  })}</TableBody></Table>;
}
