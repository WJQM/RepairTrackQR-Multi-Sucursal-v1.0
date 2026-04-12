import { sileo as _sileo } from "sileo";

const DURATION = 3000;

export const sileo = {
  success: (opts: any) => _sileo.success({ duration: DURATION, ...opts }),
  error: (opts: any) => _sileo.error({ duration: DURATION, ...opts }),
  warning: (opts: any) => _sileo.warning({ duration: DURATION, ...opts }),
  info: (opts: any) => _sileo.info({ duration: DURATION, ...opts }),
  promise: _sileo.promise.bind(_sileo),
  dismiss: _sileo.dismiss.bind(_sileo),
  clear: _sileo.clear.bind(_sileo),
};
