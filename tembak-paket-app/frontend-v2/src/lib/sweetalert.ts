"use client";
import SwalOrigin from "sweetalert2";

export const Swal = {
  ...SwalOrigin,
  fire: ((...args: any[]) => {
    let opts: any = {};
    if (args.length === 1 && typeof args[0] === "object" && args[0] !== null) {
      opts = { ...args[0] };
    } else if (args.length >= 2 && typeof args[0] === "string") {
      opts = {
        title: args[0],
        text: args[1],
        icon: args[2] || "info",
      };
    } else if (args.length === 1 && typeof args[0] === "string") {
      opts = {
        title: args[0],
      };
    } else {
      return (SwalOrigin.fire as any)(...args);
    }

    const isConfirm = Boolean(
      opts.showCancelButton ||
      opts.showDenyButton ||
      opts.input ||
      opts.preConfirm
    );

    if (!isConfirm) {
      if (opts.timer === undefined) opts.timer = 2500;
      if (opts.timerProgressBar === undefined) opts.timerProgressBar = true;

      // Double-safety: ensure popup automatically dismisses after timer
      const originalDidOpen = opts.didOpen;
      opts.didOpen = (popup: HTMLElement) => {
        if (typeof originalDidOpen === "function") {
          originalDidOpen(popup);
        }
        const dismissTime = Number(opts.timer) || 2500;
        setTimeout(() => {
          try {
            if (SwalOrigin.isVisible()) {
              SwalOrigin.close();
            }
          } catch {}
        }, dismissTime + 100);
      };
    }

    if (opts.allowOutsideClick === undefined) opts.allowOutsideClick = true;
    if (opts.allowEscapeKey === undefined) opts.allowEscapeKey = true;

    return SwalOrigin.fire(opts);
  }) as typeof SwalOrigin.fire,
  close: (...args: any[]) => SwalOrigin.close(...args),
  isVisible: () => SwalOrigin.isVisible(),
  getPopup: () => SwalOrigin.getPopup(),
  getContainer: () => SwalOrigin.getContainer(),
  getTitle: () => SwalOrigin.getTitle(),
  getHtmlContainer: () => SwalOrigin.getHtmlContainer(),
  getImage: () => SwalOrigin.getImage(),
  getIcon: () => SwalOrigin.getIcon(),
  getConfirmButton: () => SwalOrigin.getConfirmButton(),
  getDenyButton: () => SwalOrigin.getDenyButton(),
  getCancelButton: () => SwalOrigin.getCancelButton(),
  showLoading: (...args: any[]) => (SwalOrigin as any).showLoading(...args),
  hideLoading: () => SwalOrigin.hideLoading(),
  isLoading: () => SwalOrigin.isLoading(),
  mixin: (...args: any[]) => (SwalOrigin as any).mixin(...args),
};

export default Swal;

