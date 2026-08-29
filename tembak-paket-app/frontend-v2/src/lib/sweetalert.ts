"use client";
import SwalOrigin from "sweetalert2";

export function createSweetAlert() {
  const customFire = (...args: any[]) => {
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
      return SwalOrigin.fire(...args);
    }

    // Check if popup is an active decision/confirmation prompt
    const isConfirm = Boolean(
      opts.showCancelButton ||
      opts.showDenyButton ||
      opts.input ||
      opts.preConfirm
    );

    if (!isConfirm) {
      // Automatically dismiss within 2.5 seconds for all informational alerts
      if (opts.timer === undefined) opts.timer = 2500;
      if (opts.timerProgressBar === undefined) opts.timerProgressBar = true;
      if (opts.allowOutsideClick === undefined) opts.allowOutsideClick = true;
      if (opts.allowEscapeKey === undefined) opts.allowEscapeKey = true;
    } else {
      if (opts.allowOutsideClick === undefined) opts.allowOutsideClick = true;
      if (opts.allowEscapeKey === undefined) opts.allowEscapeKey = true;
    }

    return SwalOrigin.fire(opts);
  };

  const ProxySwal: any = new Proxy(SwalOrigin, {
    get(target, prop, receiver) {
      if (prop === "fire") {
        return customFire;
      }
      return Reflect.get(target, prop, receiver);
    },
    apply(target, thisArg, argumentsList) {
      return customFire(...argumentsList);
    }
  });

  ProxySwal.fire = customFire;
  return ProxySwal;
}

export const Swal = createSweetAlert();
export default Swal;
