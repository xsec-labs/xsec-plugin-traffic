import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { ControlThemeProvider, ErrorState } from '@xsec/ui-react';
import { themeAttributes, type ThemeSettings } from '@xsec/design-tokens';
import { PluginApp } from "./plugin-app";
import { parseContext } from "./context";
import { styles } from "./styles/index";
import type { Disposable, PluginContext, PluginHost } from "./types";

function settingsFromTheme(theme: Record<string, string>): ThemeSettings {
  const mode = theme['color-mode'], density = theme['ui-density'], motion = theme['reduce-motion'];
  if (mode !== 'light' && mode !== 'dark') throw Error('Host 颜色模式无效');
  if (density !== 'compact' && density !== 'comfortable') throw Error('Host 密度无效');
  if (motion !== 'true' && motion !== 'false') throw Error('Host 减少动效设置无效');
  if (!/^\d+(?:\.\d+)?px$/.test(theme['ui-font-size'] ?? '')) throw Error('Host 字号无效');
  if (!/^\d+(?:\.\d+)?px$/.test(theme['code-font-size'] ?? '')) throw Error('Host 代码字号无效');
  if (!theme['font-code'] || !CSS.supports('font-family', theme['font-code'])) throw Error('Host 代码字体无效');
  const settings: ThemeSettings = { colorMode: mode, density, reducedMotion: motion === 'true',
    fontScale: Number(theme['ui-font-size']!.slice(0,-2)) / 14, locale: 'zh-CN' };
  themeAttributes(settings);
  return settings;
}
function initialTheme(): Record<string, string> {
  const style = getComputedStyle(document.documentElement);
  return Object.fromEntries(['color-mode','ui-density','reduce-motion','ui-font-size','code-font-size','font-code'].map(key=>[key,style.getPropertyValue('--xsec-'+key).trim()]));
}

/** Install styles for the active plugin surface. */
function installStyles(root: HTMLElement): HTMLStyleElement {
  const style = document.createElement("style");
  style.dataset.xsecTrafficStyles = ""; style.textContent = styles; root.before(style);
  return style;
}

type Controller = {
  mount(root: HTMLElement, context: unknown): void;
  update(context: unknown): void;
  dispose(): void;
};

/** Read initial context from the active plugin context. */
function readInitialContext(host: PluginHost): PluginContext | undefined {
  if (host.context?.kind === undefined) return undefined;
  return parseContext(host.context);
}

/** Activate the Traffic frontend controller against the Desktop host bridge. */
export function createController(host: PluginHost): Controller {
  if (host.apiVersion !== 2) throw new Error(`不支持的 Frontend API：${host.apiVersion}`);
  console.debug("traffic.frontend.activate", { apiVersion: host.apiVersion });
  let root: HTMLElement | undefined;
  let reactRoot: Root | undefined;
  let appearance: ThemeSettings;
  let themeError: string | undefined;
  let themeErrorId: string | undefined;
  let current = readInitialContext(host);
  let themeSubscription: Disposable | undefined;
  let style: HTMLStyleElement | undefined;
  const draw = () => {
    if (!root || !current) return;
    if (!reactRoot) throw Error('抓包页面尚未挂载');
    flushSync(()=>reactRoot!.render(<ControlThemeProvider settings={appearance} className="traffic-theme">
      {themeError ? <ErrorState title="显示设置无效" description={themeError} errorId={themeErrorId}/> : <PluginApp host={host} context={current!}/>}
    </ControlThemeProvider>));
  };
  const cleanup = () => {
    const failures: unknown[] = [];
    for (const release of [() => themeSubscription?.dispose(), () => reactRoot?.unmount(), () => style?.remove()]) {
      try { release(); } catch (error) { failures.push(error); }
    }
    themeSubscription = undefined; reactRoot = undefined; style = undefined;
    root = undefined; current = undefined;
    if (failures.length) throw new AggregateError(failures, '抓包页面释放失败');
  };
  return {
    mount(nextRoot, context) {
      if (reactRoot) throw Error('抓包页面已经挂载');
      appearance = settingsFromTheme(initialTheme());
      current = parseContext(context);
      themeError = undefined; themeErrorId = undefined;
      root = nextRoot; reactRoot = createRoot(root);
      console.info("traffic.frontend.mount", {
        contextKind: current.kind,
        toolKind: current.kind === "workspace-tool" ? current.tool.kind : undefined,
      });
      try {
        style = installStyles(root);
        themeSubscription = host.onTheme(theme=>{
          if (themeError) return;
          try { appearance = settingsFromTheme(theme); }
          catch(error) { themeError = String(error); themeErrorId = crypto.randomUUID(); console.error('traffic.theme.failed', { operation_id: themeErrorId }); }
          draw();
        });
        draw();
      } catch (error) {
        try { cleanup(); } catch (cause) { throw new AggregateError([error, cause], '抓包页面初始化与释放失败'); }
        throw error;
      }
    },
    update(context) {
      current = parseContext(context);
      console.debug("traffic.frontend.update", {
        contextKind: current.kind,
        visible: current.kind === "workspace-tool" ? current.visible : undefined,
      });
      draw();
    },
    dispose() {
      console.debug("traffic.frontend.dispose");
      cleanup();
    },
  };
}
