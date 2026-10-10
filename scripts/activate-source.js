/**
 * Activate the Traffic frontend and expose its host lifecycle.
 * @param {object} host Desktop host bridge for the active plugin surface.
 * @returns {object} Explicit mount, update, and dispose lifecycle delegates.
 */
export function activate(host){
  const controller=__CONTROLLER__(host);
  return{
    /**
     * Mount the active Traffic surface into the supplied root and context.
     * @param {Element} root Host-owned element for the active surface.
     * @param {object} context Initial workspace-tool or settings-page context.
     * @returns {void} The delegated mount completes synchronously.
     */
    mount(root,context){return controller.mount(root,context)},
    /**
     * Update the active Traffic surface with the next host context.
     * @param {object} context Current workspace-tool or settings-page context.
     * @returns {void} The delegated update completes synchronously.
     */
    update(context){return controller.update(context)},
    /**
     * Dispose subscriptions, rendered content, and retained surface state.
     * @returns {void} The delegated cleanup completes synchronously.
     */
    dispose(){return controller.dispose()}
  };
}
