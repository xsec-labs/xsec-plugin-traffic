import { PageHeader } from '@xsec/ui-react';
import type { PluginHost } from "../types";
import { CaSection } from "./ca-section";
import { DefaultFilterSection } from "./filter-section";
import { RulesSection } from "./rules-section";

/** Render the settings page component. */
export function SettingsPage({ host }: { host: PluginHost }) {
  return <main className="traffic-settings"><div className="settings-shell"><PageHeader title="抓包流量" description="配置工作台默认过滤、MITM CA 和被动检测规则。"/><DefaultFilterSection host={host} /><CaSection host={host} /><RulesSection host={host} /></div></main>;
}
