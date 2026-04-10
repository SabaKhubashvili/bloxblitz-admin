import type { TowersWagerWindow } from './towers-wager-window';

export type TowersRestrictionSnapshot = {
  username: string;
  banned: boolean;
  banReason: string | null;
  dailyWagerLimit: number | null;
  weeklyWagerLimit: number | null;
  monthlyWagerLimit: number | null;
  limitReason: string | null;
};

export class TowersPlayerRestriction {
  private constructor(private readonly snap: TowersRestrictionSnapshot) {}

  static fromSnapshot(s: TowersRestrictionSnapshot): TowersPlayerRestriction {
    return new TowersPlayerRestriction(s);
  }

  toSnapshot(): TowersRestrictionSnapshot {
    return { ...this.snap };
  }

  isBanned(): boolean {
    return this.snap.banned;
  }

  hasAnyWagerLimit(): boolean {
    return (
      this.isPositiveLimit(this.snap.dailyWagerLimit) ||
      this.isPositiveLimit(this.snap.weeklyWagerLimit) ||
      this.isPositiveLimit(this.snap.monthlyWagerLimit)
    );
  }

  activeWagerWindows(): Array<{ window: TowersWagerWindow; max: number }> {
    const out: Array<{ window: TowersWagerWindow; max: number }> = [];
    if (this.isPositiveLimit(this.snap.dailyWagerLimit)) {
      out.push({ window: 'DAILY', max: this.snap.dailyWagerLimit! });
    }
    if (this.isPositiveLimit(this.snap.weeklyWagerLimit)) {
      out.push({ window: 'WEEKLY', max: this.snap.weeklyWagerLimit! });
    }
    if (this.isPositiveLimit(this.snap.monthlyWagerLimit)) {
      out.push({ window: 'MONTHLY', max: this.snap.monthlyWagerLimit! });
    }
    return out;
  }

  private isPositiveLimit(n: number | null | undefined): n is number {
    return n != null && Number.isFinite(n) && n > 0;
  }
}
