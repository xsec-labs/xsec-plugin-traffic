import tokens from '@xsec/design-tokens/styles.css';
import components from '@xsec/ui-react/styles.css';
import base from "./base.css";
import traffic from "./traffic.css";
import replay from "./replay.css";
import settings from "./settings.css";

export const styles = [tokens, components, base, traffic, replay, settings].join("\n");
