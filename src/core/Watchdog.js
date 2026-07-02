export class Watchdog {
  constructor({ getLastProgress, isRunning, onStall, stallMs = 90000, now = () => Date.now(), setIntervalImpl = (fn, ms) => setInterval(fn, ms), clearIntervalImpl = (id) => clearInterval(id) }) {
    this.getLastProgress = getLastProgress;
    this.isRunning = isRunning;
    this.onStall = onStall;
    this.stallMs = stallMs;
    this.now = now;
    this.setIntervalImpl = setIntervalImpl;
    this.clearIntervalImpl = clearIntervalImpl;
    this.timer = null;
  }

  start() {
    this.stop();
    const period = Math.max(1000, Math.floor(this.stallMs / 3));
    this.timer = this.setIntervalImpl(() => this.check(), period);
    return this;
  }

  check() {
    if (!this.isRunning()) return;
    if (this.now() - this.getLastProgress() > this.stallMs) {
      this.onStall();
    }
  }

  stop() {
    if (this.timer != null) {
      this.clearIntervalImpl(this.timer);
      this.timer = null;
    }
  }
}
